document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFiles');
    const dropArea = document.getElementById('dropArea');
    const compressionLevel = document.getElementById('compressionLevel');
    const outputFormat = document.getElementById('outputFormat');
    const resizeToggle = document.getElementById('resizeToggle');
    const resizeOptions = document.getElementById('resizeOptions');
    const compressBtn = document.getElementById('compressBtn');
    const resultsSection = document.getElementById('resultsSection');
    const imageGrid = document.getElementById('imageGrid');
    const originalSizeElement = document.getElementById('originalSize');
    const compressedSizeElement = document.getElementById('compressedSize');
    const savingsElement = document.getElementById('savings');
    const downloadAllBtn = document.getElementById('downloadAll');
    const compressMoreBtn = document.getElementById('compressMore');
    const maintainRatio = document.getElementById('maintainRatio');

    // Global variables
    let files = [];
    let compressedFiles = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    // Event Listeners
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    compressBtn.addEventListener('click', compressImages);
    resizeToggle.addEventListener('change', toggleResizeOptions);
    downloadAllBtn.addEventListener('click', downloadAll);
    compressMoreBtn.addEventListener('click', resetTool);

    // Functions
    function handleFileSelect(e) {
        files = Array.from(e.target.files);
        if (files.length > 0) {
            updateUI();
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.style.borderColor = '#4361ee';
        dropArea.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.style.borderColor = '#4361ee';
        dropArea.style.backgroundColor = 'white';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        handleDragLeave(e);
        
        files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            updateUI();
        } else {
            alert('Please drop image files only (JPG, PNG, WEBP)');
        }
    }

    function toggleResizeOptions() {
        if (resizeToggle.checked) {
            resizeOptions.style.display = 'block';
        } else {
            resizeOptions.style.display = 'none';
        }
    }

    function updateUI() {
        compressBtn.disabled = false;
        dropArea.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--success-color)"></i>
            <h2>${files.length} ${files.length === 1 ? 'file' : 'files'} selected</h2>
            <p>Ready to compress</p>
        `;
    }

    function compressImages() {
        if (files.length === 0) return;
        
        // Show loading state
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<span class="spinner"></span> Compressing...';
        
        // Reset totals
        totalOriginalSize = 0;
        totalCompressedSize = 0;
        compressedFiles = [];
        imageGrid.innerHTML = '';
        
        // Process each file
        const promises = files.map(file => processImage(file));
        
        Promise.all(promises).then(() => {
            // Calculate totals
            const savings = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1);
            
            // Update summary
            originalSizeElement.textContent = formatFileSize(totalOriginalSize);
            compressedSizeElement.textContent = formatFileSize(totalCompressedSize);
            savingsElement.textContent = `${savings}%`;
            
            // Show results
            resultsSection.style.display = 'block';
            compressBtn.disabled = false;
            compressBtn.textContent = 'Compress Images';
            
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }).catch(error => {
            console.error('Error compressing images:', error);
            alert('An error occurred while compressing images. Please try again.');
            compressBtn.disabled = false;
            compressBtn.textContent = 'Compress Images';
        });
    }

    function processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Calculate original size
                    totalOriginalSize += file.size;
                    
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Handle resizing if enabled
                    let width = img.width;
                    let height = img.height;
                    
                    if (resizeToggle.checked) {
                        const resizeWidth = parseInt(document.getElementById('resizeWidth').value);
                        const resizeHeight = parseInt(document.getElementById('resizeHeight').value);
                        
                        if (resizeWidth && !resizeHeight && maintainRatio.checked) {
                            // Only width specified, maintain aspect ratio
                            const ratio = img.height / img.width;
                            width = resizeWidth;
                            height = Math.round(resizeWidth * ratio);
                        } else if (!resizeWidth && resizeHeight && maintainRatio.checked) {
                            // Only height specified, maintain aspect ratio
                            const ratio = img.width / img.height;
                            height = resizeHeight;
                            width = Math.round(resizeHeight * ratio);
                        } else if (resizeWidth && resizeHeight) {
                            // Both width and height specified
                            width = resizeWidth;
                            height = resizeHeight;
                        }
                    }
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Determine output format
                    let format = outputFormat.value;
                    if (format === 'original') {
                        format = file.type.split('/')[1];
                    }
                    
                    // Quality setting (0-1)
                    const quality = 1 - (compressionLevel.value / 100);
                    
                    // Convert to data URL
                    let mimeType;
                    switch (format) {
                        case 'jpg':
                        case 'jpeg':
                            mimeType = 'image/jpeg';
                            break;
                        case 'png':
                            mimeType = 'image/png';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            break;
                        default:
                            mimeType = file.type;
                    }
                    
                    canvas.toBlob(function(blob) {
                        const compressedFile = new File([blob], `compressed_${file.name.split('.')[0]}.${format}`, {
                            type: mimeType
                        });
                        
                        // Update compressed size total
                        totalCompressedSize += blob.size;
                        
                        // Add to compressed files array
                        compressedFiles.push({
                            original: file,
                            compressed: compressedFile,
                            originalSize: file.size,
                            compressedSize: blob.size
                        });
                        
                        // Create and append image card
                        createImageCard(file, compressedFile, blob);
                        
                        resolve();
                    }, mimeType, quality);
                };
                
                img.onerror = function() {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    function createImageCard(originalFile, compressedFile, blob) {
        const card = document.createElement('div');
        card.className = 'image-card';
        
        const originalSize = originalFile.size;
        const compressedSize = compressedFile.size;
        const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            card.innerHTML = `
                <img src="${e.target.result}" alt="Compressed ${originalFile.name}" class="image-preview">
                <div class="image-info">
                    <h3>${compressedFile.name}</h3>
                    <div class="image-stats">
                        <span>${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}</span>
                        <span>${savings}% saved</span>
                    </div>
                    <div class="image-actions">
                        <button class="btn secondary download-single" data-index="${compressedFiles.length - 1}">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <a href="${URL.createObjectURL(blob)}" target="_blank" class="btn">
                            <i class="fas fa-eye"></i> Preview
                        </a>
                    </div>
                </div>
            `;
            
            // Add event listener to download button
            card.querySelector('.download-single').addEventListener('click', function() {
                downloadImage(this.getAttribute('data-index'));
            });
            
            imageGrid.appendChild(card);
        };
        
        reader.readAsDataURL(compressedFile);
    }

    function downloadImage(index) {
        const file = compressedFiles[index].compressed;
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadAll() {
        if (compressedFiles.length === 0) return;
        
        // For multiple files, we'll create a zip (using JSZip library would be better)
        // For simplicity, we'll download them one by one
        compressedFiles.forEach((file, index) => {
            setTimeout(() => downloadImage(index), index * 300);
        });
    }

    function resetTool() {
        files = [];
        compressedFiles = [];
        fileInput.value = '';
        resultsSection.style.display = 'none';
        
        dropArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <h2>Drag & Drop Your Images Here</h2>
            <p>or</p>
            <button id="selectFiles" class="btn">Select Files</button>
            <p class="formats">Supports: JPG, PNG, WEBP</p>
        `;
        
        // Re-attach event listener to the new select files button
        document.getElementById('selectFiles').addEventListener('click', () => fileInput.click());
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
