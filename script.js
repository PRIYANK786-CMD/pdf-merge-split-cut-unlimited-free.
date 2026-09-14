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

// 3. CUT & REORDER FUNCTIONALITY (Supports Large PDFs + Ranges like 650-670)
let loadedPdfDoc = null;
let totalLoadedPages = 0;
let selectedPageSequence = []; 

async function loadPdfForCutting(event) {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    loadedPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    totalLoadedPages = loadedPdfDoc.getPageCount();
    
    document.getElementById('cut-input-container').classList.remove('hidden');
    const gridContainer = document.getElementById('page-grid-container');
    const grid = document.getElementById('page-grid');
    grid.innerHTML = '';
    selectedPageSequence = [];
    updateSequenceCounter();
    gridContainer.classList.remove('hidden');

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
        wrapper.dataset.pageIndex = i - 1;

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
        selectedPageSequence.splice(existingIndex, 1);
        wrapper.classList.remove('border-indigo-600', 'bg-indigo-50');
        badge.className = "absolute top-1 right-1 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-bold";
        badge.innerText = pageIndex + 1;
    } else {
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
    document.getElementById('cut-pages-input').value = '';
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

async function exportCustomPDF() {
    if (!loadedPdfDoc) {
        alert('Please upload a PDF file first.');
        return;
    }

    let finalIndices = [];
    const textInputVal = document.getElementById('cut-pages-input').value.trim();

    if (textInputVal.length > 0) {
        finalIndices = parsePageRanges(textInputVal, totalLoadedPages);
        if (finalIndices.length === 0) {
            alert('Please enter valid page numbers or ranges (e.g., 501, 600, 650-670). Check for out-of-range pages.');
            return;
        }
    } else {
        finalIndices = selectedPageSequence;
    }

    if (finalIndices.length === 0) {
        alert('Please select pages visually from the grid or type page numbers/ranges to export.');
        return;
    }

    const newPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await newPdf.copyPages(loadedPdfDoc, finalIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    downloadBlob(pdfBytes, "cut-and-sequenced-utility.pdf", "application/pdf");
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