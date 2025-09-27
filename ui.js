const statusDisplay = document.getElementById('status');
const vadButton = document.getElementById('vadButton');
const audioPlaybackContainer = document.getElementById('audioPlaybackContainer');

export function updateStatus(text, color = '#606770') {
    statusDisplay.textContent = text;
    statusDisplay.style.color = color;
}

export function setVadButtonState(isActive) {
    if (isActive) {
        vadButton.textContent = 'Deactivate VAD';
        vadButton.classList.add('active');
    } else {
        vadButton.textContent = 'Activate VAD';
        vadButton.classList.remove('active');
    }
}

export function createAudioPreview(wavBlob) {
    audioPlaybackContainer.innerHTML = ''; // Clear previous audio
    const url = URL.createObjectURL(wavBlob);
    const audio = new Audio(url);
    audio.controls = true;
    audioPlaybackContainer.appendChild(audio);
}