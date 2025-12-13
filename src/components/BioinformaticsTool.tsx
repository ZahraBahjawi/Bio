import { useState, useEffect } from 'react';

interface ValidationResult {
  sequence: string;
  isValid: boolean;
  invalidChars: string;
}

const geneticCode: Record<string, string> = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
};

export default function BioinformaticsTool() {
  const [input, setInput] = useState('');
  const [stats, setStats] = useState({
    length: 0,
    gc: 0,
    a: 0,
    t: 0,
    g: 0,
    c: 0
  });
  const [output, setOutput] = useState('Results will appear here...');
  const [alert, setAlert] = useState<{ message: string; type: 'warning' | 'error' | 'success' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validate and clean DNA sequence
  const cleanAndValidate = (raw: string): ValidationResult => {
    const cleaned = raw.replace(/[\s0-9]/g, '').toUpperCase();
    const isValid = /^[ATGC]*$/.test(cleaned);
    const invalidChars = cleaned.replace(/[ATGC]/g, '');
    return { sequence: cleaned, isValid, invalidChars };
  };

  // Update statistics on input change
  useEffect(() => {
    const { sequence, isValid } = cleanAndValidate(input);

    if (sequence.length > 0) {
      const counts = {
        a: (sequence.match(/A/g) || []).length,
        t: (sequence.match(/T/g) || []).length,
        g: (sequence.match(/G/g) || []).length,
        c: (sequence.match(/C/g) || []).length
      };

      const gcContent = ((counts.g + counts.c) / sequence.length * 100).toFixed(2);

      setStats({
        length: sequence.length,
        gc: parseFloat(gcContent),
        a: counts.a,
        t: counts.t,
        g: counts.g,
        c: counts.c
      });

      if (!isValid) {
        setAlert({ message: 'Invalid characters detected. Only A, T, G, C are allowed.', type: 'warning' });
      } else {
        setAlert(null);
      }
    } else {
      setStats({ length: 0, gc: 0, a: 0, t: 0, g: 0, c: 0 });
      setAlert(null);
    }
  }, [input]);

  const showAlert = (message: string, type: 'warning' | 'error' | 'success') => {
    setAlert({ message, type });
    if (type === 'success') {
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const calculateGCContent = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);

    if (sequence.length === 0) {
      showAlert('Please enter a DNA sequence first.', 'error');
      return;
    }

    if (!isValid) {
      showAlert(`Warning: Invalid characters detected (${invalidChars}). They have been removed.`, 'warning');
    }

    const gCount = (sequence.match(/G/g) || []).length;
    const cCount = (sequence.match(/C/g) || []).length;
    const gcPercentage = ((gCount + cCount) / sequence.length * 100).toFixed(2);

    setOutput(`
      <div class="space-y-2">
        <p><strong>GC Content Analysis</strong></p>
        <p>Sequence Length: ${sequence.length} bp</p>
        <p>Guanine (G) Count: ${gCount}</p>
        <p>Cytosine (C) Count: ${cCount}</p>
        <p>GC Count: ${gCount + cCount}</p>
        <p class="text-lg text-blue-600 font-bold mt-4">GC Content: ${gcPercentage}%</p>
        <p class="text-sm text-gray-600 italic mt-4">GC content affects DNA stability and melting temperature.</p>
      </div>
    `);
    showAlert('GC content calculated successfully!', 'success');
  };

  const generateReverseComplement = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);

    if (sequence.length === 0) {
      showAlert('Please enter a DNA sequence first.', 'error');
      return;
    }

    if (!isValid) {
      showAlert(`Warning: Invalid characters detected (${invalidChars}). They have been removed.`, 'warning');
    }

    const complement: Record<string, string> = { 'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G' };
    const reversed = sequence.split('').reverse().join('');
    const reverseComplement = reversed.split('').map(base => complement[base]).join('');

    const formatSeq = (seq: string) => seq.match(/.{1,10}/g)?.join(' ') || seq;

    setOutput(`
      <div class="space-y-3">
        <p><strong>Reverse Complement Generation</strong></p>
        <p><strong>Original Sequence (5' → 3'):</strong></p>
        <p class="font-mono text-blue-600">${formatSeq(sequence)}</p>
        <p><strong>Reverse Complement (5' → 3'):</strong></p>
        <p class="font-mono text-blue-600">${formatSeq(reverseComplement)}</p>
        <p>Length: ${reverseComplement.length} bp</p>
        <p class="text-sm text-gray-600 italic">The reverse complement represents the complementary DNA strand.</p>
      </div>
    `);
    showAlert('Reverse complement generated successfully!', 'success');
  };

  const translateToProtein = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);

    if (sequence.length === 0) {
      showAlert('Please enter a DNA sequence first.', 'error');
      return;
    }

    if (!isValid) {
      showAlert(`Warning: Invalid characters detected (${invalidChars}). They have been removed.`, 'warning');
    }

    const startIndex = sequence.indexOf('ATG');

    if (startIndex === -1) {
      showAlert('No start codon (ATG) found in the sequence.', 'error');
      setOutput('<p><strong>Translation Failed</strong></p><p>No start codon (ATG) was found.</p>');
      return;
    }

    const codingSequence = sequence.substring(startIndex);
    let protein = '';
    let stopCodonFound = false;
    let stopPosition = -1;

    for (let i = 0; i < codingSequence.length; i += 3) {
      const codon = codingSequence.substring(i, i + 3);
      if (codon.length < 3) break;

      const aminoAcid = geneticCode[codon];
      if (aminoAcid === '*') {
        stopCodonFound = true;
        stopPosition = startIndex + i;
        break;
      }

      protein += aminoAcid;
    }

    const codingLength = stopCodonFound ? stopPosition - startIndex : Math.floor(codingSequence.length / 3) * 3;
    const formattedProtein = protein.match(/.{1,50}/g)?.join('<br/>') || protein;

    setOutput(`
      <div class="space-y-2">
        <p><strong>DNA to Protein Translation</strong></p>
        <p>Start Codon Position: ${startIndex + 1} bp</p>
        ${stopCodonFound ? `<p>Stop Codon Position: ${stopPosition + 1} bp</p>` : ''}
        <p>Coding Sequence Length: ${codingLength} bp</p>
        <p>Protein Length: ${protein.length} amino acids</p>
        <p><strong>Amino Acid Sequence:</strong></p>
        <p class="font-mono text-blue-600 text-sm">${formattedProtein}</p>
        ${!stopCodonFound ? '<p class="text-sm text-yellow-600">Note: No stop codon found.</p>' : ''}
      </div>
    `);
    showAlert('Translation completed successfully!', 'success');
  };

  const searchBLAST = async () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);

    if (sequence.length === 0) {
      showAlert('Please enter a DNA sequence first.', 'error');
      return;
    }

    if (!isValid) {
      showAlert(`Warning: Invalid characters detected (${invalidChars}). They have been removed.`, 'warning');
    }

    if (sequence.length < 20) {
      showAlert('Sequence too short. Minimum 20 nucleotides required for BLAST search.', 'error');
      return;
    }

    setIsLoading(true);
    setOutput('Searching NCBI BLAST database... This may take 30-60 seconds...');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/blast-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sequence }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showAlert(data.error || 'BLAST search failed', 'error');
        setOutput(`<p class="text-red-600"><strong>Error:</strong> ${data.error || 'Unknown error occurred'}</p>`);
        setIsLoading(false);
        return;
      }

      if (response.status === 202) {
        showAlert('BLAST search is still processing. Please try again in a moment.', 'warning');
        setOutput(`<p class="text-yellow-600">Request ID: ${data.requestId}</p><p>Please wait and try again soon.</p>`);
        setIsLoading(false);
        return;
      }

      const hits = data.hits || [];

      if (hits.length === 0) {
        setOutput('<p class="text-gray-600">No matches found in BLAST database.</p>');
        showAlert('No matches found', 'warning');
      } else {
        let resultHTML = '<div class="space-y-4">';
        resultHTML += '<p><strong>BLAST Search Results - Top Matches</strong></p>';
        resultHTML += '<p class="text-sm text-gray-600">Organisms matching your sequence:</p>';
        resultHTML += '<div class="space-y-3">';

        hits.forEach((hit, index) => {
          resultHTML += `
            <div class="border-l-4 border-green-500 pl-3 py-2">
              <p class="font-semibold text-green-700">${index + 1}. ${hit.organism}</p>
              <p class="text-xs text-gray-600 mt-1">Match: ${hit.description}</p>
              <p class="text-xs text-gray-600">Identity: ${hit.identity}% | E-value: ${hit.evalue} | Score: ${hit.score}</p>
            </div>
          `;
        });

        resultHTML += '</div>';
        resultHTML += '<p class="text-xs text-gray-500 italic mt-4">BLAST results are based on NCBI GenBank database comparisons.</p>';
        resultHTML += '</div>';

        setOutput(resultHTML);
        showAlert(`Found ${hits.length} matching organisms!`, 'success');
      }
    } catch (error) {
      console.error('BLAST error:', error);
      showAlert('Connection error. Please try again.', 'error');
      setOutput('<p class="text-red-600"><strong>Error:</strong> Failed to connect to BLAST service</p>');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setInput('');
    setOutput('Results will appear here...');
    setAlert(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-8 text-white text-center">
          <h1 className="text-4xl font-bold mb-2">DNA Sequence Analysis Tool</h1>
          <p className="text-lg opacity-95">Advanced Bioinformatics Analysis Platform</p>
        </div>

        <div className="p-8">
          {alert && (
            <div
              className={`p-4 mb-6 rounded-lg border-l-4 animate-in fade-in slide-in-from-top ${
                alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                  : alert.type === 'error'
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : 'bg-green-50 border-green-400 text-green-800'
              }`}
            >
              {alert.message}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-teal-600 mb-3 border-l-4 border-teal-600 pl-4">
              Sequence Input
            </h2>
            <div className="bg-blue-50 border-l-4 border-teal-600 p-4 mb-4 rounded text-sm text-gray-700">
              Enter your DNA sequence below (A, T, G, C). The tool will automatically remove numbers and whitespace.
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your DNA sequence here... (e.g., ATGCGATCGATCG)"
              className="w-full h-40 p-4 border-2 border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-teal-600 resize-vertical"
              spellCheck="false"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-teal-600 mb-4 border-l-4 border-teal-600 pl-4">
              Analysis Tools
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={calculateGCContent}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Calculate GC Content
              </button>
              <button
                onClick={generateReverseComplement}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Reverse Complement
              </button>
              <button
                onClick={translateToProtein}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Translate to Protein
              </button>
              <button
                onClick={searchBLAST}
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Searching...' : 'Identify Organism (BLAST)'}
              </button>
              <button
                onClick={clearAll}
                className="px-6 py-2 bg-gray-400 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-teal-600 mb-4 border-l-4 border-teal-600 pl-4">
              Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Sequence Length', value: stats.length },
                { label: 'GC Content', value: stats.gc.toFixed(2) + '%' },
                { label: 'A Count', value: stats.a },
                { label: 'T Count', value: stats.t },
                { label: 'G Count', value: stats.g },
                { label: 'C Count', value: stats.c }
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg border-l-4 border-teal-600 shadow-sm">
                  <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-teal-600">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-teal-600 mb-3 border-l-4 border-teal-600 pl-4">
              Output
            </h2>
            <div
              className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5 font-mono text-sm min-h-24 max-h-80 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: output }}
            />
          </div>
        </div>

        <div className="bg-gray-100 px-8 py-4 text-center text-sm text-gray-600 border-t">
          DNA Sequence Analysis Tool | For Research and Educational Purposes
        </div>
      </div>
    </div>
  );
}
