// Tab Switching Utility
function switchTab(tabName) {
    ['merge', 'split', 'cut'].forEach(t => {
        document.getElementById(`section-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).className = "py-3 px-6 font-semibold text-slate-500 hover:text-slate-700 focus:outline-none transition";
    });
    document.getElementById(`section-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "py-3 px-6 font-semibold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition";
}

// 1. MERGE PDF FUNCTIONALITY
async function mergePDFs() {
    const fileInput = document.getElementById('merge-files');
    if (fileInput.files.length < 2) {
        alert('Please select at least 2 PDF files to merge.');
        return;
    }

    const mergedPdf = await PDFLib.PDFDocument.create();
    
    for (let file of fileInput.files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfFileBytes = await mergedPdf.save();
    downloadBlob(mergedPdfFileBytes, "merged-document.pdf", "application/pdf");
}

// 2. SPLIT PDF FUNCTIONALITY
async function splitPDF() {
    const fileInput = document.getElementById('split-file');
    if (fileInput.files.length === 0) {
        alert('Please select a PDF file to split.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const numberOfPages = pdf.getPageCount();

    for (let i = 0; i < numberOfPages; i++) {
        const subPdf = await PDFLib.PDFDocument.create();
        const [copiedPage] = await subPdf.copyPages(pdf, [i]);
        subPdf.addPage(copiedPage);
        const pdfBytes = await subPdf.save();
        downloadBlob(pdfBytes, `page-${i + 1}.pdf`, "application/pdf");
    }
}

// 3. CUT & REORDER FUNCTIONALITY VARIABLES
let loadedPdfDoc = null;
let selectedPageSequence = []; // Stores indices in the exact sequence clicked

async function loadPdfForCutting(event) {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    loadedPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    const gridContainer = document.getElementById('page-grid-container');
    const grid = document.getElementById('page-grid');
    grid.innerHTML = '';
    selectedPageSequence = [];
    updateSequenceCounter();
    gridContainer.classList.remove('hidden');

    // Render page previews using PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfJsDoc = await loadingTask.promise;
    
    for (let i = 1; i <= pdfJsDoc.numPages; i++) {
        const page = await pdfJsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;

        const wrapper = document.createElement('div');
        wrapper.className = "relative border-2 border-slate-200 rounded-lg p-2 flex flex-col items-center cursor-pointer hover:border-indigo-400 transition bg-white";
        wrapper.dataset.pageIndex = i - 1; // 0-indexed reference

        const badge = document.createElement('span');
        badge.className = "absolute top-1 right-1 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-bold";
        badge.innerText = i;

        wrapper.appendChild(canvas);
        wrapper.appendChild(badge);

        wrapper.onclick = () => togglePageSelection(i - 1, wrapper, badge);
        grid.appendChild(wrapper);
    }
}

function togglePageSelection(pageIndex, wrapper, badge) {
    const existingIndex = selectedPageSequence.indexOf(pageIndex);
    
    if (existingIndex > -1) {
        // Deselect and re-sequence remaining
        selectedPageSequence.splice(existingIndex, 1);
        wrapper.classList.remove('border-indigo-600', 'bg-indigo-50');
        badge.className = "absolute top-1 right-1 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-bold";
        badge.innerText = pageIndex + 1;
    } else {
        // Select and assign next sequential step number (1, 2, 3...)
        selectedPageSequence.push(pageIndex);
        wrapper.classList.add('border-indigo-600', 'bg-indigo-50');
        badge.className = "absolute top-1 right-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow";
        badge.innerText = selectedPageSequence.length;
    }
    updateSequenceCounter();
}

function clearSelection() {
    selectedPageSequence = [];
    document.querySelectorAll('#page-grid > div').forEach((wrapper, idx) => {
        wrapper.classList.remove('border-indigo-600', 'bg-indigo-50');
        const badge = wrapper.querySelector('span');
        badge.className = "absolute top-1 right-1 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-bold";
        badge.innerText = idx + 1;
    });
    updateSequenceCounter();
}

function updateSequenceCounter() {
    const counter = document.getElementById('sequence-counter');
    if (selectedPageSequence.length === 0) {
        counter.innerText = "Selected Sequence: None";
    } else {
        const displaySeq = selectedPageSequence.map(p => p + 1).join(', ');
        counter.innerText = `Selected Sequence: [ ${displaySeq} ]`;
    }
}

async function exportCustomPDF() {
    if (!loadedPdfDoc || selectedPageSequence.length === 0) {
        alert('Please upload a PDF and select at least one page in your preferred sequence.');
        return;
    }

    const newPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await newPdf.copyPages(loadedPdfDoc, selectedPageSequence);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    downloadBlob(pdfBytes, "custom-sequenced-utility.pdf", "application/pdf");
}

// Helper utility to trigger client-side file download
function downloadBlob(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}