// Tab Switching Utility
function switchTab(tabName) {
    ['merge', 'split', 'cut', 'delete'].forEach(t => {
        document.getElementById(`section-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).className = "py-3 px-6 font-semibold text-slate-500 hover:text-slate-700 focus:outline-none transition whitespace-nowrap";
    });
    document.getElementById(`section-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "py-3 px-6 font-semibold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition whitespace-nowrap";
}

// Universal parser for both Numbers (1,2,3) and Letters (A,B,C -> 1,2,3)
function parseSequenceInput(inputStr, maxLimit) {
    if (!inputStr || inputStr.trim() === "") return [];
    
    const parts = inputStr.split(',').map(s => s.trim());
    const resultIndices = [];

    for (let part of parts) {
        if (/^\d+$/.test(part)) {
            // Numeric format: 1, 2, 3... (convert to 0-indexed)
            let val = parseInt(part, 10) - 1;
            if (val >= 0 && val < maxLimit) resultIndices.push(val);
        } else if (/^[a-zA-Z]+$/.test(part)) {
            // Alphabetical format: A, B, C, D... (A=1, B=2, etc.)
            let upper = part.toUpperCase();
            let val = 0;
            for (let i = 0; i < upper.length; i++) {
                val = val * 26 + (upper.charCodeAt(i) - 64);
            }
            let indexVal = val - 1;
            if (indexVal >= 0 && indexVal < maxLimit) resultIndices.push(indexVal);
        }
    }
    return resultIndices;
}

// 1. MERGE WITH TYPED SEQUENCE (1,2,3 or A,B,C)
async function mergePDFsCustomSequence() {
    const fileInput = document.getElementById('merge-files');
    const seqInput = document.getElementById('merge-sequence-input').value;

    if (fileInput.files.length === 0) {
        alert('Please upload PDF files first.');
        return;
    }

    const files = Array.from(fileInput.files);
    let targetIndices = parseSequenceInput(seqInput, files.length);

    // If sequence box is empty, fallback to default order (0, 1, 2...)
    if (targetIndices.length === 0) {
        targetIndices = files.map((_, idx) => idx);
    }

    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let idx of targetIndices) {
        if (files[idx]) {
            const arrayBuffer = await files[idx].arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
    }

    const bytes = await mergedPdf.save();
    downloadBlob(bytes, "custom-merged-utility.pdf", "application/pdf");
}

// 2. SPLIT PDF BY TYPED PAGES
async function splitPDFTyped() {
    const fileInput = document.getElementById('split-file');
    const seqInput = document.getElementById('split-sequence-input').value;

    if (fileInput.files.length === 0) {
        alert('Please select a PDF file.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();

    let targetPages = parseSequenceInput(seqInput, totalPages);
    if (targetPages.length === 0) {
        // Default to all pages if nothing specified
        targetPages = Array.from({ length: totalPages }, (_, i) => i);
    }

    for (let pageIdx of targetPages) {
        const subPdf = await PDFLib.PDFDocument.create();
        const [copiedPage] = await subPdf.copyPages(pdf, [pageIdx]);
        subPdf.addPage(copiedPage);
        const bytes = await subPdf.save();
        downloadBlob(bytes, `extracted-page-${pageIdx + 1}.pdf`, "application/pdf");
    }
}

// 3. CUT & REORDER VIA TYPING
async function cutPDFTyped() {
    const fileInput = document.getElementById('cut-file');
    const seqInput = document.getElementById('cut-sequence-input').value;

    if (fileInput.files.length === 0) {
        alert('Please select a PDF file.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();

    const targetPages = parseSequenceInput(seqInput, totalPages);
    if (targetPages.length === 0) {
        alert('Please enter a valid sequence (e.g., 2,1,3 or B,A,C)');
        return;
    }

    const newPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, targetPages);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const bytes = await newPdf.save();
    downloadBlob(bytes, "reordered-cut-utility.pdf", "application/pdf");
}

// 4. DELETE PAGES VIA TYPING
async function deletePDFPagesTyped() {
    const fileInput = document.getElementById('delete-file');
    const seqInput = document.getElementById('delete-sequence-input').value;

    if (fileInput.files.length === 0) {
        alert('Please select a PDF file.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();

    const pagesToDelete = parseSequenceInput(seqInput, totalPages);
    
    // Keep all pages except the ones specified for deletion
    const pagesToKeep = [];
    for (let i = 0; i < totalPages; i++) {
        if (!pagesToDelete.includes(i)) {
            pagesToKeep.push(i);
        }
    }

    const newPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, pagesToKeep);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const bytes = await newPdf.save();
    downloadBlob(bytes, "cleaned-document.pdf", "application/pdf");
}

// Download helper utility
function downloadBlob(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}