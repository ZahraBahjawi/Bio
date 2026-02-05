# BioOrigin: AI-Powered DNA Sequence Classifier
*Final project for the Building AI course*

## Summary
BioOrigin is an upgrade to a standard bioinformatics dashboard. While the current tool calculates fixed properties (like GC content and protein translation), this project proposes adding an AI model to classify unknown DNA sequences by their likely organism of origin (e.g., distinguishing between viral, bacterial, and human DNA).

## Background
* **The Problem:** Metagenomic researchers often sequence "soups" of genetic material from soil or gut samples. Identifying which organism a specific DNA fragment belongs to is difficult without slow, massive database alignments.
* **Motivation:** As a computational biology student, I want to build a lightweight tool that offers instant classification for students and researchers.
* **Importance:** Rapid identification of pathogens or contaminants is critical in both clinical and environmental biology.

## How is it used?
The solution is integrated into the existing web-based dashboard:
1. **Input:** The user pastes a raw DNA sequence into the text area.
2. **Analysis:** The AI analyzes the "k-mer" frequency (patterns of 3-4 nucleotides).
3. **Output:** The system displays a probability score (e.g., "85% probability: E. coli").

## Data sources and AI methods
* **Data:** The model will be trained on public genome data from **NCBI GenBank**, specifically reference genomes for model organisms like *H. sapiens*, *E. coli*, and *Lambda phage*.
* **AI Techniques:**
    * **Bag of Words (k-mers):** We will treat DNA substrings (k-mers) like words in a sentence to create frequency vectors.
    * **K-Nearest Neighbors (KNN):** This algorithm will classify new sequences based on their similarity to known genomes in the k-mer vector space.

## Challenges
* **Sequence Length:** Short DNA fragments (<100bp) may not contain enough information for accurate classification.
* **Mutation Rates:** Rapidly mutating viruses might evade detection if they differ significantly from the training data.
* **Computation:** Running KNN on millions of fragments can be slow; optimization or pre-clustering will be required.

## What next?
* **Deep Learning:** Move from KNN to a Convolutional Neural Network (CNN) to detect complex motifs.
* **Browser Integration:** Implement the model in TensorFlow.js to run entirely client-side, ensuring user data privacy.

## Acknowledgments
* Inspired by the *Elements of AI* course structure.
* Biological data concepts from NCBI GenBank.
