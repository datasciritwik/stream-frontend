import * as ui from './ui.js';
import * as api from './api.js';
import { VADProcessor } from './vad.js';
import { resample, float32ToWav } from './audioUtils.js';

let vadProcessor = null;

async function handleUtterance(rawAudio) {
    ui.updateStatus('Processing and uploading...', '#007bff');
    
    try {
        // Resample the 48k audio from VAD to 24k for the server
        const resampledAudio = resample(new Float32Array(rawAudio), 48000, 24000);
        const wavBlob = await float32ToWav(resampledAudio);

        // Upload and create a preview
        await api.uploadAudio(wavBlob);
        ui.createAudioPreview(wavBlob);
        ui.updateStatus('Utterance sent!', '#007bff');

    } catch (error) {
        ui.updateStatus('Upload failed. Please try again.', '#dc3545');
    } finally {
        // NEW: CRITICAL STEP
        // Tell the VAD processor that it can start listening again,
        // whether the upload succeeded or failed.
        if (vadProcessor) {
            vadProcessor.utteranceProcessed();
        }
    }
}

function handleVadToggle() {
    console.log('VAD button clicked');
    if (vadProcessor && vadProcessor.isActive) {
        console.log('Stopping VAD');
        vadProcessor.stop();
        ui.setVadButtonState(false);
    } else {
        console.log('Starting VAD');
        vadProcessor = new VADProcessor(handleUtterance, ui.updateStatus);
        vadProcessor.start().then(() => {
            console.log('VAD started successfully'); // Add this
        }).catch(error => {
            console.error('VAD failed to start:', error); // Add this
        });
        ui.setVadButtonState(true);
    }
}

function initialize() {
    document.getElementById('vadButton').addEventListener('click', handleVadToggle);
    console.log("Voice AI Client Initialized");
}

initialize();