import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BlastHit {
  title: string;
  evalue: string;
  query_from: number;
  query_to: number;
  hit_from: number;
  hit_to: number;
  identity: number;
  gaps: number;
  bit_score: string;
}

interface BlastResult {
  hits: BlastHit[];
  query_id: string;
  query_len: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sequence } = await req.json();

    // Validate input
    if (!sequence || sequence.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No sequence provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clean the sequence
    const cleanedSeq = sequence.replace(/[\s0-9]/g, "").toUpperCase();

    if (cleanedSeq.length < 20) {
      return new Response(
        JSON.stringify({
          error: "Sequence too short. Minimum 20 nucleotides required for BLAST search.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Submit sequence to NCBI BLAST
    const submitResponse = await fetch(
      "https://blast.ncbi.nlm.nih.gov/Blast.cgi",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          QUERY: cleanedSeq,
          PROGRAM: "blastn",
          DATABASE: "nt",
          FORMAT_TYPE: "json",
          EXPECT: "0.05",
          HITLIST_SIZE: "10",
        }).toString(),
      }
    );

    if (!submitResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to submit BLAST request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const submitText = await submitResponse.text();
    const requestIdMatch = submitText.match(/RID = ([^\s]+)/);
    const rtoe = submitText.match(/RTOE = (\d+)/);

    if (!requestIdMatch) {
      return new Response(
        JSON.stringify({ error: "Could not initiate BLAST search" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestId = requestIdMatch[1];
    const waitTime = rtoe ? parseInt(rtoe[1]) : 5;

    // Wait for results
    await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

    // Poll for results
    let attempts = 0;
    const maxAttempts = 30;
    let resultsReady = false;
    let resultData = null;

    while (attempts < maxAttempts && !resultsReady) {
      const checkResponse = await fetch(
        `https://blast.ncbi.nlm.nih.gov/Blast.cgi?CMD=Get&RID=${requestId}&FORMAT_TYPE=json`,
        { method: "GET" }
      );

      if (checkResponse.ok) {
        const text = await checkResponse.text();

        if (text.includes('"BlastOutput2"')) {
          try {
            resultData = JSON.parse(text);
            resultsReady = true;
          } catch {
            // Wait and retry
          }
        }
      }

      if (!resultsReady) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!resultsReady || !resultData) {
      return new Response(
        JSON.stringify({
          message:
            "BLAST search is still processing. Please try again in a moment.",
          requestId: requestId,
        }),
        {
          status: 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse results
    const results = parseBlastResults(resultData);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("BLAST error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred during BLAST search",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function parseBlastResults(data: unknown): {
  hits: Array<{
    organism: string;
    description: string;
    evalue: string;
    score: string;
    identity: number;
  }>;
} {
  const hits = [];

  try {
    // Navigate the BLAST JSON structure
    const blastOutput = (data as Record<string, unknown>)["BlastOutput2"];
    if (!Array.isArray(blastOutput) || blastOutput.length === 0) {
      return { hits: [] };
    }

    const report = (blastOutput[0] as Record<string, unknown>)["report"] as Record<
      string,
      unknown
    >;
    const results = report["results"] as Record<string, unknown>;
    const search = results["search"] as Record<string, unknown>;
    const searchResults = search["hits"] as Array<Record<string, unknown>>;

    if (!Array.isArray(searchResults)) {
      return { hits: [] };
    }

    searchResults.slice(0, 10).forEach((hit) => {
      const description = hit["description"] as Array<Record<string, unknown>>;
      const hspData = hit["hsps"] as Array<Record<string, unknown>>;

      if (Array.isArray(description) && description.length > 0) {
        const firstDesc = description[0];
        const title = (firstDesc["title"] as string) || "Unknown";
        const organism = extractOrganism(title);

        if (Array.isArray(hspData) && hspData.length > 0) {
          const hsp = hspData[0];
          const evalue = (hsp["evalue"] as string) || "N/A";
          const bitScore = (hsp["bit_score"] as string) || "N/A";
          const identity =
            ((hsp["identity"] as number) / ((hsp["align_len"] as number) || 1)) *
            100;

          hits.push({
            organism,
            description: title,
            evalue,
            score: bitScore,
            identity: parseFloat(identity.toFixed(2)),
          });
        }
      }
    });
  } catch (error) {
    console.error("Error parsing BLAST results:", error);
  }

  return { hits };
}

function extractOrganism(title: string): string {
  // Extract organism name from NCBI title format
  // Format is usually: "species [organism]"
  const match = title.match(/\[([^\]]+)\]/);
  return match ? match[1] : title.split(" ").slice(0, 2).join(" ");
}
