// DOM elements
const inputPath = document.getElementById('inputPath');
const outputPath = document.getElementById('outputPath');
const selectVideoBtn = document.getElementById('selectVideoBtn');
const selectOutputBtn = document.getElementById('selectOutputBtn');
const processBtn = document.getElementById('processBtn');
const modeSelect = document.getElementById('modeSelect');
const thresholdRange = document.getElementById('thresholdRange');
const thresholdValue = document.getElementById('thresholdValue');
const minFramesRange = document.getElementById('minFramesRange');
const minFramesValue = document.getElementById('minFramesValue');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const statusMessage = document.getElementById('statusMessage');

// State
let selectedVideo = null;
let selectedOutput = null;

// Update range value displays
thresholdRange.addEventListener('input', (e) => {
    thresholdValue.textContent = e.target.value;
});

minFramesRange.addEventListener('input', (e) => {
    minFramesValue.textContent = e.target.value;
});

// Select video file
selectVideoBtn.addEventListener('click', async () => {
    const filePath = await window.electronAPI.selectVideo();
    if (filePath) {
        selectedVideo = filePath;
        inputPath.value = filePath;
        checkReadyToProcess();
    }
});

// Select output directory
selectOutputBtn.addEventListener('click', async () => {
    const dirPath = await window.electronAPI.selectOutput();
    if (dirPath) {
        selectedOutput = dirPath;
        outputPath.value = dirPath;
        checkReadyToProcess();
    }
});

// Check if we can enable the process button
function checkReadyToProcess() {
    processBtn.disabled = !(selectedVideo && selectedOutput);
}

// Process video
processBtn.addEventListener('click', async () => {
    // Disable UI during processing
    processBtn.disabled = true;
    selectVideoBtn.disabled = true;
    selectOutputBtn.disabled = true;
    modeSelect.disabled = true;
    thresholdRange.disabled = true;
    minFramesRange.disabled = true;

    // Show progress
    progressContainer.classList.add('active');
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    statusMessage.textContent = 'Starting processing...';

    // Gather settings
    const settings = {
        mode: modeSelect.value,
        threshold: parseFloat(thresholdRange.value),
        minFrames: parseInt(minFramesRange.value)
    };

    try {
        const result = await window.electronAPI.processVideo({
            inputPath: selectedVideo,
            outputDir: selectedOutput,
            settings: settings
        });

        // Success
        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        statusMessage.textContent = '✅ ' + result.message;
        statusMessage.style.color = '#4caf50';

        // Reset after 3 seconds
        setTimeout(() => {
            resetUI();
        }, 3000);

    } catch (error) {
        // Error
        statusMessage.textContent = '❌ ' + error.message;
        statusMessage.style.color = '#f44336';
        console.error('Processing error:', error);

        // Reset after 5 seconds
        setTimeout(() => {
            resetUI();
        }, 5000);
    }
});

// Listen for progress updates
window.electronAPI.onProgress((progress) => {
    progressFill.style.width = progress + '%';
    progressFill.textContent = progress + '%';
    statusMessage.textContent = `Processing frames... ${progress}%`;
});

// Reset UI after processing
function resetUI() {
    processBtn.disabled = false;
    selectVideoBtn.disabled = false;
    selectOutputBtn.disabled = false;
    modeSelect.disabled = false;
    thresholdRange.disabled = false;
    minFramesRange.disabled = false;
    progressContainer.classList.remove('active');
    statusMessage.style.color = '#666';
}