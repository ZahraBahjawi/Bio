import { useState, useEffect } from 'react';
import { 
  Dna, 
  Search, 
  RefreshCw, 
  FileText, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon, 
  ExternalLink, 
  Trash2,
  Calculator, 
  Scissors,
  TrendingUp,
  Target // Added for gRNA
} from 'lucide-react';

interface ValidationResult {
  sequence: string;
  isValid: boolean;
  invalidChars: string;
}

interface BlastResult {
  id: string;
  name: string;
  description: string;
  image?: string;
  source: string; 
}

interface BlastStatus {
  step: 'idle' | 'submitting' | 'waiting' | 'parsing' | 'fetching_images' | 'complete' | 'error';
  message: string;
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

const aminoAcidProperties: Record<string, { name: string; type: string }> = {
  'F': { name: 'Phenylalanine', type: 'Hydrophobic' },
  'L': { name: 'Leucine', type: 'Hydrophobic' },
  'I': { name: 'Isoleucine', type: 'Hydrophobic' },
  'M': { name: 'Methionine', type: 'Hydrophobic' },
  'V': { name: 'Valine', type: 'Hydrophobic' },
  'S': { name: 'Serine', type: 'Polar' },
  'P': { name: 'Proline', type: 'Special' },
  'T': { name: 'Threonine', type: 'Polar' },
  'A': { name: 'Alanine', type: 'Hydrophobic' },
  'Y': { name: 'Tyrosine', type: 'Polar' },
  'H': { name: 'Histidine', type: 'Charged' },
  'Q': { name: 'Glutamine', type: 'Polar' },
  'N': { name: 'Asparagine', type: 'Polar' },
  'K': { name: 'Lysine', type: 'Charged' },
  'D': { name: 'Aspartate', type: 'Charged' },
  'E': { name: 'Glutamate', type: 'Charged' },
  'C': { name: 'Cysteine', type: 'Special' },
  'W': { name: 'Tryptophan', type: 'Hydrophobic' },
  'R': { name: 'Arginine', type: 'Charged' },
  'G': { name: 'Glycine', type: 'Special' },
  '*': { name: 'Stop', type: 'Stop' }
};

const kyteDoolittleScale: Record<string, number> = {
  'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
  'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
  'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
  'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
};

const PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

const DATABASES = [
  { name: 'nt', label: 'Nucleotide Collection (Standard)' },
  { name: 'refseq_representative_genomes', label: 'RefSeq Genomes (Fast)' },
  { name: 'refseq_rna', label: 'RefSeq RNA' }
];

export default function BioinformaticsTool() {
  const [input, setInput] = useState('');
  const [stats, setStats] = useState({ length: 0, gc: 0, a: 0, t: 0, g: 0, c: 0 });
  const [output, setOutput] = useState('<p class="text-brand-slate opacity-70">Results will appear here...</p>');
  const [alert, setAlert] = useState<{ message: string; type: 'warning' | 'error' | 'success' } | null>(null);
  const [blastStatus, setBlastStatus] = useState<BlastStatus>({ step: 'idle', message: '' });

  const cleanAndValidate = (raw: string): ValidationResult => {
    let cleaned = raw;
    if (cleaned.trim().startsWith('>')) {
        cleaned = cleaned.split('\n').slice(1).join('');
    }
    cleaned = cleaned.replace(/[\s0-9]/g, '').toUpperCase();
    const isValid = /^[ATGC]*$/.test(cleaned);
    const invalidChars = cleaned.replace(/[ATGC]/g, '');
    return { sequence: cleaned, isValid, invalidChars };
  };

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
      setStats({ length: sequence.length, gc: parseFloat(gcContent), a: counts.a, t: counts.t, g: counts.g, c: counts.c });
      if (!isValid) setAlert({ message: 'Invalid characters detected. Only A, T, G, C are allowed.', type: 'warning' });
      else setAlert(null);
    } else {
      setStats({ length: 0, gc: 0, a: 0, t: 0, g: 0, c: 0 });
      setAlert(null);
    }
  }, [input]);

  const showAlert = (message: string, type: 'warning' | 'error' | 'success') => {
    setAlert({ message, type });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  // --- ANALYSIS FUNCTIONS ---

  const calculateGCContent = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    const gCount = (sequence.match(/G/g) || []).length;
    const cCount = (sequence.match(/C/g) || []).length;
    const gcPercentage = ((gCount + cCount) / sequence.length * 100).toFixed(2);

    setOutput(`
      <div class="space-y-4">
        <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><Calculator size={24} /> GC Content Analysis</p>
        <div class="bg-brand-slate/20 p-6 rounded-xl border border-brand-slate/30">
          <p class="text-lg text-white">Sequence Length: <strong class="text-brand-lime">${sequence.length} bp</strong></p>
          <p class="text-lg mt-3 text-white">GC Content: <strong class="text-brand-lime text-3xl block mt-1">${gcPercentage}%</strong></p>
        </div>
        <p class="text-sm text-brand-slate italic">Higher GC content typically indicates greater thermal stability of the DNA molecule.</p>
      </div>
    `);
    showAlert('GC content calculated successfully!', 'success');
  };

  const generateReverseComplement = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    const complement: Record<string, string> = { 'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G' };
    const reversed = sequence.split('').reverse().join('');
    const reverseComplement = reversed.split('').map(base => complement[base]).join('');
    const formatSeq = (seq: string) => seq.match(/.{1,10}/g)?.join(' ') || seq;

    setOutput(`
      <div class="space-y-6">
        <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><Scissors size={24} /> Reverse Complement</p>
        
        <div class="bg-brand-black/20 p-4 rounded-xl border border-brand-slate/20">
          <p class="text-xs font-bold text-brand-slate uppercase mb-2">Original (5' → 3')</p>
          <div class="font-mono text-sm text-brand-slate/80 break-all leading-relaxed">${formatSeq(sequence)}</div>
        </div>
        
        <div class="bg-brand-green/20 p-4 rounded-xl border border-brand-green/40 shadow-[0_0_20px_rgba(70,137,2,0.2)]">
          <p class="text-xs font-bold text-brand-lime uppercase mb-2">Reverse Complement (5' → 3')</p>
          <div class="font-mono text-sm text-white break-all leading-relaxed">${formatSeq(reverseComplement)}</div>
        </div>
      </div>
    `);
    showAlert('Reverse complement generated!', 'success');
  };

  const translateToProtein = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    const startIndex = sequence.indexOf('ATG');
    if (startIndex === -1) { showAlert('No start codon (ATG) found.', 'error'); setOutput('<p class="font-bold text-red-400">Translation Failed: No start codon (ATG) found.</p>'); return; }

    const codingSequence = sequence.substring(startIndex);
    let protein = '';
    let stopCodonFound = false;
    
    const aaStats = { Hydrophobic: 0, Polar: 0, Charged: 0, Special: 0 };

    for (let i = 0; i < codingSequence.length; i += 3) {
      const codon = codingSequence.substring(i, i + 3);
      if (codon.length < 3) break;
      const aminoAcid = geneticCode[codon];
      
      if (aminoAcid === '*') { 
        stopCodonFound = true; 
        break; 
      }
      
      protein += aminoAcid;
      
      const props = aminoAcidProperties[aminoAcid];
      if (props) {
        if (props.type.includes('Charged')) aaStats.Charged++;
        else if (props.type === 'Hydrophobic') aaStats.Hydrophobic++;
        else if (props.type === 'Polar') aaStats.Polar++;
        else aaStats.Special++;
      }
    }

    const formattedProtein = protein.match(/.{1,50}/g)?.join('<br/>') || protein;
    const molecularWeight = (protein.length * 110 / 1000).toFixed(2);
    const total = protein.length || 1;
    const getWidth = (count: number) => Math.max(5, (count / total) * 100) + '%';

    setOutput(`
      <div class="space-y-6">
        <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><Dna size={24} /> Protein Translation</p>
        
        <div class="grid grid-cols-3 gap-3 text-sm">
            <div class="bg-brand-slate/10 p-3 rounded-lg border border-brand-slate/20"><span class="block text-brand-slate text-xs mb-1 uppercase tracking-wider">Start</span><span class="text-white font-mono font-bold">${startIndex + 1} bp</span></div>
            <div class="bg-brand-slate/10 p-3 rounded-lg border border-brand-slate/20"><span class="block text-brand-slate text-xs mb-1 uppercase tracking-wider">Length</span><span class="text-white font-mono font-bold">${protein.length} aa</span></div>
             <div class="bg-brand-slate/10 p-3 rounded-lg border border-brand-slate/20"><span class="block text-brand-slate text-xs mb-1 uppercase tracking-wider">Mass</span><span class="text-white font-mono font-bold">${molecularWeight} kDa</span></div>
        </div>

        <div class="bg-brand-black/20 p-4 rounded-xl border border-brand-slate/20">
           <p class="text-xs font-bold text-brand-slate uppercase mb-4 tracking-wider">Composition Analysis</p>
           <div class="space-y-3 text-xs font-medium">
              <div class="flex items-center gap-3">
                <span class="w-24 text-brand-slate">Hydrophobic</span>
                <div class="flex-1 bg-brand-dark rounded-full h-2 overflow-hidden border border-white/5"><div class="bg-yellow-400 h-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" style="width: ${getWidth(aaStats.Hydrophobic)}"></div></div>
                <span class="w-8 text-right text-white font-mono">${aaStats.Hydrophobic}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-24 text-brand-slate">Polar</span>
                <div class="flex-1 bg-brand-dark rounded-full h-2 overflow-hidden border border-white/5"><div class="bg-blue-400 h-full shadow-[0_0_10px_rgba(96,165,250,0.5)]" style="width: ${getWidth(aaStats.Polar)}"></div></div>
                <span class="w-8 text-right text-white font-mono">${aaStats.Polar}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-24 text-brand-slate">Charged</span>
                <div class="flex-1 bg-brand-dark rounded-full h-2 overflow-hidden border border-white/5"><div class="bg-red-400 h-full shadow-[0_0_10px_rgba(248,113,113,0.5)]" style="width: ${getWidth(aaStats.Charged)}"></div></div>
                <span class="w-8 text-right text-white font-mono">${aaStats.Charged}</span>
              </div>
           </div>
        </div>

        <div>
          <p class="text-xs font-bold text-brand-slate uppercase mb-2">Amino Acid Sequence</p>
          <div class="font-mono text-sm text-brand-lime break-all bg-brand-black/30 p-5 border border-brand-lime/20 rounded-xl leading-relaxed tracking-wide">${formattedProtein}</div>
        </div>
        ${!stopCodonFound ? '<p class="text-xs text-orange-400 font-semibold flex items-center gap-2 bg-orange-400/10 p-2 rounded border border-orange-400/20"><AlertCircle size={14}/> Note: No stop codon found. Translation continued to end.</p>' : ''}
      </div>
    `);
    showAlert('Translation successful!', 'success');
  };

  const generateHydropathyPlot = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    const startIndex = sequence.indexOf('ATG');
    if (startIndex === -1) { showAlert('No start codon (ATG) found for translation.', 'error'); return; }

    const codingSequence = sequence.substring(startIndex);
    let protein = '';
    for (let i = 0; i < codingSequence.length; i += 3) {
      const codon = codingSequence.substring(i, i + 3);
      if (codon.length < 3) break;
      const aminoAcid = geneticCode[codon];
      if (aminoAcid === '*') break;
      protein += aminoAcid;
    }

    if (protein.length < 9) {
        showAlert('Protein sequence too short for hydropathy plot (need >9 AA).', 'error');
        return;
    }

    // Sliding Window Calculation (Window Size: 9)
    const windowSize = 9;
    const scores = [];
    for (let i = 0; i <= protein.length - windowSize; i++) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            sum += kyteDoolittleScale[protein[i+j]] || 0;
        }
        scores.push(sum / windowSize);
    }

    // Generate SVG path
    const height = 200;
    const width = 600;
    const maxScore = 4.5;
    const minScore = -4.5;
    const range = maxScore - minScore;

    const points = scores.map((score, i) => {
        const x = (i / (scores.length - 1)) * width;
        const y = height - ((score - minScore) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const zeroY = height - ((0 - minScore) / range) * height;

    setOutput(`
      <div class="space-y-6">
        <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><TrendingUp size={24} /> Kyte-Doolittle Hydropathy Plot</p>

        <div class="bg-brand-black/40 p-4 rounded-xl border border-brand-slate/20 overflow-hidden relative">
           <svg viewBox="0 0 ${width} ${height}" class="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="${zeroY}" x2="${width}" y2="${zeroY}" stroke="#628290" stroke-width="1" stroke-dasharray="4" opacity="0.5" />
              <polyline points="${points}" fill="none" stroke="#b1de00" stroke-width="2" vector-effect="non-scaling-stroke" />
              <polygon points="0,${zeroY} ${points} ${width},${zeroY}" fill="#b1de00" opacity="0.1" />
           </svg>

           <div class="absolute top-2 left-2 text-xs text-brand-slate font-mono">Hydrophobic (+4.5)</div>
           <div class="absolute bottom-2 left-2 text-xs text-brand-slate font-mono">Hydrophilic (-4.5)</div>
           <div class="absolute bottom-2 right-2 text-xs text-brand-slate font-mono">Position</div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="bg-brand-slate/10 p-3 rounded-lg border border-brand-slate/20">
                <span class="block text-brand-slate text-xs uppercase">Window Size</span>
                <span class="text-white font-mono font-bold">9 AA</span>
            </div>
            <div class="bg-brand-slate/10 p-3 rounded-lg border border-brand-slate/20">
                <span class="block text-brand-slate text-xs uppercase">Protein Length</span>
                <span class="text-white font-mono font-bold">${protein.length} AA</span>
            </div>
        </div>

        <p class="text-xs text-brand-slate italic mt-2">
            Values above the center line indicate hydrophobic regions (potential transmembrane domains).
        </p>
      </div>
    `);
    showAlert('Hydropathy plot generated!', 'success');
  };

  const findMotifs = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    const motifRaw = prompt("Enter a DNA motif to find (e.g., GAATTC for EcoRI, or TATA):", "GAATTC");
    if (!motifRaw) return;

    const motif = motifRaw.toUpperCase().replace(/[^ATGC]/g, '');
    if (motif.length === 0) { showAlert("Invalid motif. Only A, T, G, C allowed.", "error"); return; }

    let count = 0;
    let pos = sequence.indexOf(motif);
    const positions = [];
    while (pos !== -1) {
        count++;
        positions.push(pos + 1);
        pos = sequence.indexOf(motif, pos + 1);
    }

    const posString = positions.join(', ');
    const formattedPos = posString.length > 100 ? posString.substring(0, 100) + '...' : posString;

    setOutput(`
      <div class="space-y-6">
        <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><Scissors size={24} /> Motif Finder</p>
        
        <div class="bg-brand-slate/20 p-6 rounded-xl border border-brand-slate/30 flex items-center justify-between">
          <div>
            <span class="block text-brand-slate text-xs uppercase tracking-wider mb-1">Searching For</span>
            <span class="font-mono text-2xl text-white font-bold tracking-widest">${motif}</span>
          </div>
          <div class="text-right">
            <span class="block text-brand-slate text-xs uppercase tracking-wider mb-1">Matches Found</span>
            <span class="font-mono text-3xl text-brand-lime font-bold">${count}</span>
          </div>
        </div>

        <div class="bg-brand-black/20 p-5 rounded-xl border border-brand-slate/20">
           <p class="text-xs font-bold text-brand-slate uppercase mb-3">Match Locations (bp)</p>
           <div class="font-mono text-sm text-white/90 leading-relaxed bg-brand-dark p-3 rounded border border-white/5 break-all">
             ${count > 0 ? formattedPos : '<span class="text-brand-slate italic">No matches found in the sequence.</span>'}
           </div>
           ${count > 0 ? `<p class="text-xs text-brand-slate mt-2 italic">Showing 1-based indices of the start position.</p>` : ''}
        </div>
      </div>
    `);
    showAlert(`Found ${count} occurrences of ${motif}`, 'success');
  };

  const findGRNA = () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    const candidates: { pos: number; seq: string; pam: string }[] = [];
    
    // Scan for SpCas9 PAM (NGG) on forward strand
    // Need 20bp upstream + 3bp PAM = 23bp total window
    for (let i = 20; i < sequence.length - 2; i++) {
        if (sequence[i + 1] === 'G' && sequence[i + 2] === 'G') {
            const target = sequence.substring(i - 20, i);
            const pam = sequence.substring(i, i + 3);
            candidates.push({ pos: i - 20 + 1, seq: target, pam });
        }
    }

    if (candidates.length === 0) {
        setOutput('<div class="text-brand-slate">No SpCas9 (NGG) PAM sites found with sufficient upstream sequence.</div>');
        showAlert('No targets found.', 'warning');
        return;
    }

    const listHtml = candidates.slice(0, 5).map(c => `
        <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 mb-2">
            <div>
                <span class="text-xs text-brand-slate block mb-1">Position ${c.pos}</span>
                <span class="font-mono text-lg tracking-wide text-brand-lime">${c.seq}<span class="text-brand-green font-bold border-b-2 border-brand-green">${c.pam}</span></span>
            </div>
            <div class="text-xs text-brand-slate bg-brand-black/20 px-2 py-1 rounded">Forward</div>
        </div>
    `).join('');

    setOutput(`
      <div class="space-y-6">
        <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><Target size={24} /> CRISPR/Cas9 gRNA Finder</p>
        
        <div class="bg-brand-slate/20 p-6 rounded-xl border border-brand-slate/30 flex items-center justify-between">
          <div>
            <span class="block text-brand-slate text-xs uppercase tracking-wider mb-1">PAM Type</span>
            <span class="font-mono text-2xl text-white font-bold tracking-widest">NGG (SpCas9)</span>
          </div>
          <div class="text-right">
            <span class="block text-brand-slate text-xs uppercase tracking-wider mb-1">Targets Found</span>
            <span class="font-mono text-3xl text-brand-lime font-bold">${candidates.length}</span>
          </div>
        </div>

        <div class="bg-brand-black/20 p-5 rounded-xl border border-brand-slate/20">
           <p class="text-xs font-bold text-brand-slate uppercase mb-4 tracking-wider">Top Candidates (5 of ${candidates.length})</p>
           <div class="space-y-2">
             ${listHtml}
           </div>
           ${candidates.length > 5 ? `<p class="text-center text-xs text-brand-slate mt-4 italic">... and ${candidates.length - 5} more.</p>` : ''}
        </div>
      </div>
    `);
    showAlert(`Found ${candidates.length} potential gRNA targets!`, 'success');
  };

  const fetchWikiImage = async (organismName: string) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(organismName)}&prop=pageimages&format=json&pithumbsize=150&origin=*`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
            const firstPageId = Object.keys(pages)[0];
            if (firstPageId !== '-1' && pages[firstPageId].thumbnail) return pages[firstPageId].thumbnail.source;
        }
    } catch (e) {
        // Silently fail for images
    }
    return null;
  };

  const identifyOrganism = async () => {
    const { sequence, isValid, invalidChars } = cleanAndValidate(input);
    if (sequence.length === 0) { showAlert('Please enter a DNA sequence first.', 'error'); return; }
    if (!isValid) showAlert(`Warning: Invalid characters detected (${invalidChars}).`, 'warning');

    setBlastStatus({ step: 'submitting', message: 'Initializing...' });
    
    // Auto-fallback system
    for (const db of DATABASES) {
      for (const proxy of PROXIES) {
        setBlastStatus({ step: 'submitting', message: `Trying ${db.label}...` });
        
        try {
          const result = await runBlastSearch(sequence, proxy, db.name);
          if (result) {
             renderBlastResults(result, db.label);
             return; 
          }
        } catch (e) {
          console.warn(`Failed with ${proxy} on ${db.name}. Trying next...`);
        }
      }
    }

    setBlastStatus({ step: 'error', message: 'All attempts failed.' });
    setOutput(`<div class="space-y-3 bg-red-500/10 p-5 rounded-xl border border-red-500/20"><p class="font-bold text-red-400 flex items-center gap-2"><AlertCircle size={20}/> Service Unavailable</p><p class="text-sm text-red-200/80">All NCBI mirrors are currently busy or unreachable. Please try again in a few minutes.</p></div>`);
    showAlert('Failed to identify organism.', 'error');
  };

  const runBlastSearch = async (sequence: string, proxy: string, database: string): Promise<string> => {
    const NCBI_URL = 'https://blast.ncbi.nlm.nih.gov/Blast.cgi';
    
    // 1. Submit
    const putParams = new URLSearchParams({ CMD: 'Put', PROGRAM: 'blastn', DATABASE: database, QUERY: sequence });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); 

    const putResponse = await fetch(`${proxy}${NCBI_URL}?${putParams.toString()}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!putResponse.ok) throw new Error('Proxy failed');
    const putText = await putResponse.text();
    
    const ridMatch = putText.match(/RID = (.*)/);
    if (!ridMatch) throw new Error('No RID');
    const rid = ridMatch[1];

    // 2. Poll
    const startTime = Date.now();
    let status = 'WAITING';
    
    while ((status === 'WAITING' || status === 'HJ') && (Date.now() - startTime < 45000)) { 
      setBlastStatus({ step: 'waiting', message: `Scanning ${database}...` });
      await new Promise(r => setTimeout(r, 5000));
      
      try {
        const checkRes = await fetch(`${proxy}${NCBI_URL}?${new URLSearchParams({ CMD: 'Get', RID: rid, FORMAT_OBJECT: 'SearchInfo' })}`);
        const checkText = await checkRes.text();
        if (checkText.includes('Status=READY')) status = 'READY';
      } catch (e) {
        // Ignore single polling error
      }
    }

    if (status !== 'READY') throw new Error('Timeout');

    // 3. Get Results
    setBlastStatus({ step: 'parsing', message: 'Downloading...' });
    const getParams = new URLSearchParams({ CMD: 'Get', RID: rid, FORMAT_TYPE: 'Text', ALIGNMENT_VIEW: 'Pairwise' });
    const resultRes = await fetch(`${proxy}${NCBI_URL}?${getParams.toString()}`);
    return await resultRes.text();
  };

  const renderBlastResults = async (resultText: string, sourceLabel: string) => {
      // 4. PARSE
      const chunks = resultText.split('>');
      const blastResults: BlastResult[] = [];
      const seenNames = new Set<string>();

      for (let i = 1; i < chunks.length; i++) {
        if (blastResults.length >= 3) break;
        const lines = chunks[i].split('\n');
        const firstLine = lines[0].trim();
        const spaceIndex = firstLine.indexOf(' ');
        if (spaceIndex === -1) continue;

        const id = firstLine.substring(0, spaceIndex);
        const description = firstLine.substring(spaceIndex + 1).trim();

        let name = description;
        const words = description.split(/\s+/);
        if (words.length >= 2) name = words[0] + ' ' + words[1];

        name = name.replace(/\s+(str\.|strain|isolate|substr\.|subsp\.).*$/i, '');
        name = name.replace(/,?\s*(complete genome|genome|sequence|partial|chromosome|scaffold|plasmid).*$/i, '');

        if (!name || name.trim() === '') name = id;

        if (name && !seenNames.has(name)) {
            seenNames.add(name);
            blastResults.push({ id, name: name.trim(), description });
        }
      }

      if (blastResults.length === 0) {
          setOutput('<p class="text-brand-slate">No matches found.</p>');
          setBlastStatus({ step: 'complete', message: 'Done' });
          return;
      }

      // 5. FETCH IMAGES
      setBlastStatus({ step: 'fetching_images', message: 'Fetching images...' });
      const resultsWithImages = await Promise.all(blastResults.map(async (result) => {
          const img = await fetchWikiImage(result.name);
          return { ...result, image: img || undefined };
      }));

      setBlastStatus({ step: 'complete', message: 'Done' });

      // 6. RENDER
      const hitsHtml = resultsWithImages.map((hit, i) => `
        <div class="flex flex-col sm:flex-row gap-5 p-5 mb-4 border rounded-xl ${i === 0 ? 'bg-brand-green/20 border-brand-lime/50 shadow-[0_0_25px_rgba(177,222,0,0.15)]' : 'bg-brand-black/20 border-white/5'} transition-all hover:bg-brand-slate/10">
           <div class="flex-shrink-0 w-full sm:w-28 h-28 bg-brand-dark rounded-lg overflow-hidden border border-white/10 flex items-center justify-center relative group">
             ${hit.image 
                ? `<img src="${hit.image}" alt="${hit.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />` 
                : `<span class="text-xs text-brand-slate text-center p-2">No Image<br/>Available</span>`
             }
           </div>
           <div class="flex-grow">
             <div class="flex items-center gap-3 mb-2">
                <span class="font-bold text-brand-slate text-sm">#${i + 1}</span>
                <span class="font-bold text-white text-xl tracking-tight">${hit.name}</span>
                ${i === 0 ? '<span class="text-xs bg-brand-lime text-brand-black px-2 py-0.5 rounded font-bold uppercase tracking-wider">Top Match</span>' : ''}
             </div>
             <p class="text-xs text-brand-slate font-mono mb-4 line-clamp-2 leading-relaxed opacity-80" title="${hit.description}">${hit.description}</p>
             <div class="flex flex-wrap gap-4 text-xs items-center">
                <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(hit.name)}" target="_blank" class="text-brand-lime hover:text-white transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wide">
                   <ExternalLink size={14} /> Read on Wikipedia
                </a>
                <span class="text-brand-slate/20">|</span>
                <span class="text-brand-slate font-mono bg-white/5 px-2 py-1 rounded">ID: ${hit.id}</span>
             </div>
           </div>
        </div>
      `).join('');

      setOutput(`
        <div class="space-y-6">
          <div class="flex justify-between items-center border-b border-brand-slate/20 pb-4">
             <p class="text-xl font-bold text-brand-lime flex items-center gap-2"><ImageIcon size={24}/> Identification Results</p>
             <span class="text-xs font-mono text-brand-slate bg-brand-black/30 px-3 py-1.5 rounded border border-white/5">Source: ${sourceLabel}</span>
          </div>
          <div>${hitsHtml}</div>
          <div class="text-right mt-4">
            <span class="inline-flex items-center text-sm font-bold text-brand-slate hover:text-brand-lime transition-colors gap-1 cursor-help" title="Data retrieved from NCBI BLAST">
                Verified by NCBI <CheckCircle2 size={14} />
            </span>
          </div>
        </div>
      `);
      showAlert('Organism identified!', 'success');
  };

  const clearAll = () => {
    setInput('');
    setOutput('<p class="text-brand-slate opacity-70">Results will appear here...</p>');
    setAlert(null);
    setBlastStatus({ step: 'idle', message: '' });
  };

  return (
    <div className="min-h-screen bg-brand-dark font-sans text-white selection:bg-brand-lime selection:text-brand-black pb-20">
      <div className="max-w-5xl mx-auto px-4 py-16">
        
        {/* Header */}
        <div className="relative mb-16 text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-lime/10 rounded-full blur-[120px] -z-10"></div>
          
          <h1 className="text-6xl font-bold mb-4 tracking-tight flex items-center justify-center gap-5 text-white">
            <Dna className="w-16 h-16 text-brand-lime" /> 
            Bioinformatics Tool
          </h1>
          <p className="text-brand-slate text-xl tracking-widest uppercase font-medium">Sequence Analysis Platform</p>
        </div>

        <div className="bg-brand-black/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 p-8 md:p-12">
          
          {/* Alerts */}
          {alert && (
            <div className={`p-4 mb-10 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top flex items-center gap-3 border shadow-lg ${
                alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20' : 
                alert.type === 'error' ? 'bg-red-500/10 text-red-200 border-red-500/20' : 
                'bg-brand-green/20 text-brand-lime border-brand-green/40'}`}>
              {alert.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {alert.message}
            </div>
          )}

          {/* Input Section */}
          <div className="mb-12">
            <label className="block text-brand-lime font-bold text-xl mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" /> Input DNA Sequence
            </label>
            <div className="relative group">
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="> Paste raw FASTA sequence here..." 
                  className="w-full h-56 p-6 bg-brand-dark/50 border-2 border-brand-slate/20 rounded-2xl font-mono text-sm text-white placeholder-brand-slate/30 focus:outline-none focus:border-brand-lime/60 focus:ring-4 focus:ring-brand-lime/10 transition-all resize-y shadow-inner" 
                  spellCheck="false" 
                />
                <div className="absolute bottom-5 right-5 text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-black/40 text-brand-slate border border-white/5">
                  {input.replace(/[\s0-9]/g, '').length} bp
                </div>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="mb-14">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-brand-lime rounded-full shadow-[0_0_10px_#b1de00]"></span>
              Analysis Tools
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <button onClick={calculateGCContent} className="px-6 py-6 bg-brand-slate/10 text-brand-slate border border-brand-slate/20 rounded-2xl font-bold hover:bg-brand-slate/20 hover:text-white hover:border-brand-slate/40 transition-all flex flex-col items-center justify-center gap-3 group">
                <Calculator size={28} className="group-hover:scale-110 group-hover:text-brand-lime transition-all duration-300" /> 
                GC Content
              </button>
              
              <button onClick={generateReverseComplement} className="px-6 py-6 bg-brand-slate/10 text-brand-slate border border-brand-slate/20 rounded-2xl font-bold hover:bg-brand-slate/20 hover:text-white hover:border-brand-slate/40 transition-all flex flex-col items-center justify-center gap-3 group">
                <RefreshCw size={28} className="group-hover:scale-110 group-hover:text-brand-lime transition-all duration-300" /> 
                Reverse Comp
              </button>
              
              <button onClick={translateToProtein} className="px-6 py-6 bg-brand-slate/10 text-brand-slate border border-brand-slate/20 rounded-2xl font-bold hover:bg-brand-slate/20 hover:text-white hover:border-brand-slate/40 transition-all flex flex-col items-center justify-center gap-3 group">
                <Dna size={28} className="group-hover:scale-110 group-hover:text-brand-lime transition-all duration-300" /> 
                Translate
              </button>

              <button onClick={generateHydropathyPlot} className="px-6 py-6 bg-brand-slate/10 text-brand-slate border border-brand-slate/20 rounded-2xl font-bold hover:bg-brand-slate/20 hover:text-white hover:border-brand-slate/40 transition-all flex flex-col items-center justify-center gap-3 group">
                <TrendingUp size={28} className="group-hover:scale-110 group-hover:text-brand-lime transition-all duration-300" /> 
                Hydropathy
              </button>

              <button onClick={findMotifs} className="px-6 py-6 bg-brand-slate/10 text-brand-slate border border-brand-slate/20 rounded-2xl font-bold hover:bg-brand-slate/20 hover:text-white hover:border-brand-slate/40 transition-all flex flex-col items-center justify-center gap-3 group">
                <Scissors size={28} className="group-hover:scale-110 group-hover:text-brand-lime transition-all duration-300" /> 
                Motif Finder
              </button>

              <button onClick={findGRNA} className="px-6 py-6 bg-brand-slate/10 text-brand-slate border border-brand-slate/20 rounded-2xl font-bold hover:bg-brand-slate/20 hover:text-white hover:border-brand-slate/40 transition-all flex flex-col items-center justify-center gap-3 group">
                <Target size={28} className="group-hover:scale-110 group-hover:text-brand-lime transition-all duration-300" /> 
                CRISPR gRNA
              </button>
              
              <div className="col-span-2">
                <button 
                  onClick={identifyOrganism} 
                  disabled={blastStatus.step !== 'idle' && blastStatus.step !== 'complete' && blastStatus.step !== 'error'} 
                  className={`w-full h-full px-6 py-6 rounded-2xl font-bold border transition-all flex flex-row items-center justify-center gap-3 group shadow-lg ${
                    blastStatus.step !== 'idle' && blastStatus.step !== 'complete' && blastStatus.step !== 'error' 
                    ? 'bg-brand-black/40 text-brand-slate border-white/5 cursor-wait' 
                    : 'bg-brand-lime text-brand-dark hover:bg-brand-green hover:text-white hover:border-brand-green hover:shadow-[0_0_25px_rgba(177,222,0,0.4)]'
                  }`}
                >
                  {(blastStatus.step !== 'idle' && blastStatus.step !== 'complete' && blastStatus.step !== 'error') ? (
                      <>
                        <RefreshCw className="animate-spin w-7 h-7" /> 
                        {blastStatus.message || 'Running...'}
                      </>
                  ) : (
                      <>
                        <Search size={28} className="group-hover:scale-110 transition-transform duration-300" /> 
                        Identify Organism
                      </>
                  )}
                </button>
              </div>
            </div>
            
            <button onClick={clearAll} className="mt-8 text-sm font-medium text-brand-slate hover:text-white flex items-center gap-2 mx-auto transition-colors group">
                <Trash2 size={14} className="group-hover:text-brand-lime transition-colors" /> Clear all inputs and results
            </button>
          </div>

          {/* Stats & Output Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Stats Column */}
            <div className="md:col-span-1 space-y-6">
               <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                 <span className="w-1.5 h-8 bg-brand-slate rounded-full"></span>
                 Stats
               </h2>
               <div className="bg-brand-dark/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                      <span className="text-brand-slate text-sm font-bold uppercase tracking-wider">Length</span>
                      <span className="font-mono font-bold text-white text-xl">{stats.length}</span>
                    </div>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-brand-slate text-sm font-bold uppercase tracking-wider">GC%</span>
                      <span className="font-mono font-bold text-brand-lime text-xl">{stats.gc}%</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">A <span className="block font-bold text-white text-lg mt-1">{stats.a}</span></div>
                        <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">T <span className="block font-bold text-white text-lg mt-1">{stats.t}</span></div>
                        <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">G <span className="block font-bold text-white text-lg mt-1">{stats.g}</span></div>
                        <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">C <span className="block font-bold text-white text-lg mt-1">{stats.c}</span></div>
                    </div>
               </div>
            </div>

            {/* Output Column */}
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-1.5 h-8 bg-brand-green rounded-full"></span>
                  Result Output
                </h2>
                <div 
                  className="bg-brand-dark/60 border-2 border-dashed border-brand-slate/20 rounded-2xl p-8 min-h-[300px] text-white leading-relaxed overflow-hidden relative"
                  dangerouslySetInnerHTML={{ __html: output }} 
                />
            </div>

          </div>
        </div>
        
        <div className="text-center mt-16 text-brand-slate/30 text-xs font-bold tracking-[0.2em] uppercase">
          &copy; 2025 Zahra Bahjawi | Avid Affiliate Design System
        </div>
      </div>
    </div>
  );
}