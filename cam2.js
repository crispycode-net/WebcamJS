let video = null;
let stream = null;
let videoCapture = null;
let streaming = false;

let zoomFactor = 8;
let sourceWidth = 1920;
let sourceHeight = 1080;
let width = sourceWidth / zoomFactor;
let height = sourceHeight / zoomFactor;
let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;
let intermediate = null;
let info = null;
let canvasOutput_1 = null;
let canvasOutput_2 = null;
let canvasOutput_3 = null;
let canvasOutput_4 = null;
let canvasOutput_5 = null;
let canvasOutput_6 = null;
let canvasOutput_7 = null;
let canvasOutput_8 = null;
let codeFound = false;
let debugEdges = false;
let debugRects = false;
let debugContours = false;

async function opencvIsReady() {
    console.log('OpenCV.js is ready');

    info = document.getElementById('info');
    canvasOutput_1 = document.getElementById('canvasOutput_1');
    canvasOutput_2 = document.getElementById('canvasOutput_2');
    canvasOutput_3 = document.getElementById('canvasOutput_3');
    canvasOutput_4 = document.getElementById('canvasOutput_4');
    canvasOutput_5 = document.getElementById('canvasOutput_5');
    canvasOutput_6 = document.getElementById('canvasOutput_6');
    canvasOutput_7 = document.getElementById('canvasOutput_7');
    canvasOutput_8 = document.getElementById('canvasOutput_8');

    await startCamera();
}

async function startCamera() {

    const constraints = {
        video: {
            width: { ideal: sourceWidth },
            height: { ideal: sourceHeight },
            facingMode: 'environment'
        },
        audio: false,
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    video = document.querySelector("video");
    video.srcObject = stream;
    await video.play();

    sourceHeight = video.videoHeight;
    sourceWidth = video.videoWidth;
    video.setAttribute("width", sourceWidth);
    video.setAttribute("height", sourceHeight);

    videoCapture = new cv.VideoCapture(video);

    streaming = true;

    startVideoProcessing();
}

function startVideoProcessing() {
    if (!streaming) { console.warn("Please startup your webcam"); return; }
    stopVideoProcessing();
    src = new cv.Mat(sourceHeight, sourceWidth, cv.CV_8UC4);

    // Use just a portion (defined by zoomFactor) for further processing
    width = sourceWidth / zoomFactor;
    height = sourceHeight / zoomFactor;

    requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
    if (src != null && !src.isDeleted()) src.delete();
}

function processVideo() {

    if (codeFound) return;

    videoCapture.read(src);
    cv.imshow("canvasOutput", src);

    let centerMat = getMatCenter(src);
    cv.imshow("canvasOutput_1", centerMat);

    readCode();

    centerMat.delete();

    requestAnimationFrame(processVideo);
}

function getMatCenter(src) {

    let focusCenter = document.getElementById('focus-center');
    let rect = focusCenter.getBoundingClientRect();

    let container = document.getElementById('canvas-container');
    let containerRect = container.getBoundingClientRect();

    let scaleX = sourceWidth / containerRect.width;
    let scaleY = sourceHeight / containerRect.height;

    let focusCenterX = rect.left * scaleX;
    let focusCenterY = rect.top * scaleY;
    let focusCenterWidth = rect.width * scaleX;
    let focusCenterHeight = rect.height * scaleY;

    // Extract the region of interest (ROI)
    let cvRect = new cv.Rect(focusCenterX, focusCenterY, focusCenterWidth, focusCenterHeight);
    let roi = src.roi(cvRect);

    return roi;
}

async function readCode() {

    try {
        const codeReader = new ZXingBrowser.BrowserDatamatrixCodeReader();
        const result = await codeReader.decodeFromCanvas(canvasOutput_1);

        if (result) {
            codeFound = true;
            info.innerHTML = `Code: ${result.text}`;

            let button = document.getElementById('restartButton');
            button.style.display = '';
        }
    } catch (error) { }    
}

function restart() {
    codeFound = false;
    info.innerHTML = ``;
    let button = document.getElementById('restartButton');
    button.style.display = 'none';

    startCamera();
}
