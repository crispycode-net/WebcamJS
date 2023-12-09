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
            exact: 1.5,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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

    readCode(canvasOutput_1, "s1");

    let enhancedMat = enhanceFocusArea(centerMat);
    cv.imshow("canvasOutput_2", enhancedMat);

    readCode(canvasOutput_2, "s2");

    centerMat.delete();
    enhancedMat.delete();

    requestAnimationFrame(processVideo);
}

function getMatCenter(src) {

    let focusCenter = document.getElementById('focus-center');
    let rect = focusCenter.getBoundingClientRect();

    let container = document.getElementById('canvas-container');
    let containerRect = container.getBoundingClientRect();

    let relativeTop = rect.top - containerRect.top;
    let relativeLeft = rect.left - containerRect.left;
    let scaleX = sourceWidth / containerRect.width;
    let scaleY = sourceHeight / containerRect.height;

    let focusCenterX = relativeLeft * scaleX;
    let focusCenterY = relativeTop * scaleY;
    let focusCenterWidth = rect.width * scaleX;
    let focusCenterHeight = rect.height * scaleY;

    // Extract the region of interest (ROI)
    let cvRect = new cv.Rect(focusCenterX, focusCenterY, focusCenterWidth, focusCenterHeight);
    let roi = src.roi(cvRect);

    let zoomed = zoomIn(roi, 2);

    roi.delete();    

    return zoomed;
}

function enhanceFocusArea(src) {

    // Convert to Grayscale
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Step 2: Apply Adaptive Threshold
    let dst = new cv.Mat();
    let maxValue = 255;
    let adaptiveMethod = cv.ADAPTIVE_THRESH_GAUSSIAN_C; // or cv.ADAPTIVE_THRESH_MEAN_C
    let thresholdType = cv.THRESH_BINARY; // or cv.THRESH_BINARY_INV
    let blockSize = 111; // It must be an odd number
    let C = 4; // Constant subtracted from the mean or weighted sum

    cv.adaptiveThreshold(gray, dst, maxValue, adaptiveMethod, thresholdType, blockSize, C);

    // 'dst' is now a binary image after adaptive thresholding

    gray.delete();

    return dst;
}

function zoomIn(src, factor) {
    
    let dst = new cv.Mat();
    let interpolation = cv.INTER_LINEAR;
    let dsize = new cv.Size(src.cols * 2, src.rows * 2);
    cv.resize(src, dst, dsize, 0, 0, interpolation);

    return dst;
}

async function readCode(canvas, infoTxt) {

    try {
        const codeReader = new ZXingBrowser.BrowserDatamatrixCodeReader();
        const result = await codeReader.decodeFromCanvas(canvas);

        if (result) {
            codeFound = true;
            info.innerHTML = `Code: ${result.text} ${infoTxt}`;
            info.style.display = '';

            let button = document.getElementById('restartButton');
            button.style.display = '';

            let focusCenter = document.getElementById('focus-center');
            focusCenter.style.border = '4px solid green';
        }
    } catch (error) { }    
}

function restart() {
    codeFound = false;
    info.innerHTML = ``;
    info.style.display = 'none';

    let button = document.getElementById('restartButton');
    button.style.display = 'none';

    let focusCenter = document.getElementById('focus-center');
    focusCenter.style.border = '4px solid red';

    startCamera();
}
