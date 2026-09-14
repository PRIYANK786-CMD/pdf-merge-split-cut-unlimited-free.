// Tab Switching Utility
function switchTab(tabName) {
    ['merge', 'split', 'cut'].forEach(t => {
        document.getElementById(`section-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).className = "py-3 px-6 font-semibold text-slate-500 hover:text-slate-700 focus:outline-none transition";
    });
    document.getElementById(`section-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "py-3 px-6 font-semibold text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition";
}

// 1. MERGE PDF FUNCTIONALITY (Auto-Sequenced by Name: 1,2,3 or B,D,F)
async function mergePDFs() {
    const fileInput = document.getElementById('merge-files');
    if (fileInput.files.length < 2) {
        alert('Please select at least 2 PDF files to merge.');
        return;
    }

    const filesArray = Array.from(fileInput.files);
    filesArray.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const mergedPdf = await PDFLib.PDFDocument.create();
    
    for (let file of filesArray) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfFileBytes = await mergedPdf.save();
    downloadBlob(mergedPdfFileBytes, "merged-document.pdf", "application/pdf");
}

// 2. SPLIT & EXTRACT SPECIFIC PAGES FUNCTIONALITY
async function splitPDF() {
    const fileInput = document.getElementById('split-file');
    const pagesInput = document.getElementById('split-pages-input').value.trim();

    if (fileInput.files.length === 0) {
        alert('Please select a PDF file first.');
        return;
    }

    if (!pagesInput) {
        alert('Please type the page numbers you want to extract (e.g., 2, 4, 6, 54, 55).');
        return;
    }

    const pageNumbers = pagesInput.split(',')
        .map(num => parseInt(num.trim(), 10))
        .filter(num => !isNaN(num));

    if (pageNumbers.length === 0) {
        alert('Please enter valid page numbers separated by commas.');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();

    const indicesToExtract = [];
    for (let pNum of pageNumbers) {
        const index = pNum - 1;
        if (index >= 0 && index < totalPages) {
            indicesToExtract.push(index);
        } else {
            alert(`Page number ${pNum} is out of range. This PDF only has ${totalPages} pages.`);
            return;
        }
    }

    const newPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, indicesToExtract);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    downloadBlob(pdfBytes, "extracted-custom-pages.pdf", "application/pdf");
}

// 3. CUT & REORDER FUNCTIONALITY (Pure Manual Range Typing: 10, 15-25, etc.)
async function cutPDF() {
    const fileInput = document.getElementById('cut-file');
    const pagesInput = document.getElementById('cut-pages-input').value.trim();

    if (fileInput.files.length === 0) {
        alert('Please select a PDF file first.');
        return;
    }

    if (!pagesInput) {
        alert('Please type page numbers or ranges to cut (e.g., 10, 15-25, 32, 70-80).');
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const loadedPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalLoadedPages = loadedPdfDoc.getPageCount();

    const finalIndices = parsePageRanges(pagesInput, totalLoadedPages);
    
    if (finalIndices.length === 0) {
        alert(`Please enter valid page numbers within the range of 1 to ${totalLoadedPages}.`);
        return;
    }

    const newPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await newPdf.copyPages(loadedPdfDoc, finalIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    downloadBlob(pdfBytes, "cut-and-sequenced-utility.pdf", "application/pdf");
}

// Helper utility to parse numbers and ranges like "10, 15-25, 32"
function parsePageRanges(inputStr, maxPages) {
    let indices = [];
    let parts = inputStr.split(',');

    for (let part of parts) {
        part = part.trim();
        if (!part) continue;

        if (part.includes('-')) {
            let rangeBounds = part.split('-');
            if (rangeBounds.length === 2) {
                let start = parseInt(rangeBounds[0].trim(), 10);
                let end = parseInt(rangeBounds[1].trim(), 10);
                if (!isNaN(start) && !isNaN(end)) {
                    let step = start <= end ? 1 : -1;
                    for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
                        let idx = i - 1; 
                        if (idx >= 0 && idx < maxPages) {
                            indices.push(idx);
                        }
                    }
                }
            }
        } else {
            let pageNum = parseInt(part, 10);
            if (!isNaN(pageNum)) {
                let idx = pageNum - 1;
                if (idx >= 0 && idx < maxPages) {
                    indices.push(idx);
                }
            }
        }
    }
    return indices;
}

// Helper utility for client-side download
function downloadBlob(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}