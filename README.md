1. Project Title
BioOrigin: AI-Powered DNA Sequence Classifier

2. Summary
This project upgrades a standard bioinformatics analysis tool with an AI component. While standard tools calculate fixed properties (like protein translation), BioOrigin uses machine learning to classify unknown DNA sequences by their likely organism of origin (e.g., distinguishing between viral, bacterial, and human DNA). This helps researchers quickly identify contaminants or unknown pathogens in raw sequencing data.

3. Background
The Problem: When researchers sequence DNA from environmental samples (like soil or gut microbiome), they get a "soup" of genetic material. Identifying which organism a specific DNA fragment belongs to is difficult without aligning it to massive databases, which is slow.

Frequency: This is a daily challenge in metagenomics and pathogen detection.

Motivation: As a computational biology student, I want to build a lightweight tool that offers instant, "approximate" classification without needing a supercomputer.

4. How is it used?
The solution is integrated into a web-based bioinformatics dashboard.

Input: The user pastes a raw DNA sequence (e.g., from a FASTA file).

Process: The system cleans the input and calculates "k-mer frequencies" (counting how often 3-letter or 4-letter patterns appear).

Prediction: The AI compares these frequencies to known profiles and outputs a probability score (e.g., "85% probability this is E. coli DNA").

5. Data sources and AI methods
Data: The model will be trained on public genome data from NCBI GenBank (National Center for Biotechnology Information). I will download reference genomes for common model organisms (Human H. sapiens, Bacteria E. coli, Virus Lambda phage).

AI Techniques:

Feature Extraction: I will use the "Bag of Words" technique (similar to text analysis), but instead of words, I will count k-mers (substrings of length k, like ATG, TGC).

Classification: I will use K-Nearest Neighbors (KNN) to classify the new sequence based on which training genomes it most closely resembles in k-mer space.

6. Challenges
Sequence Length: Short DNA fragments (under 100bp) might not carry enough signal for accurate classification.

Mutation Rates: Viruses mutate rapidly; the model might fail to recognize a highly mutated strain.

New Organisms: The model can only classify organisms it has seen before; completely new species might be misclassified.

7. What next?
To grow this project, I would:

Expand the training data to include thousands of species.

Implement a Neural Network (CNN) which can often detect complex motifs better than simple k-mer counting.

Host the model online using TensorFlow.js so it runs directly in the browser (client-side) to protect user data privacy.
