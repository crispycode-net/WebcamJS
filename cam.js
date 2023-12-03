let video = null;
let stream = null;
let vc = null;
let streaming = false;

let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;
let intermediate = null;
let info = null;

async function opencvIsReady() {
    console.log('OpenCV.js is ready');    

    info = document.getElementById('info');

    await startCamera();
}

async function startCamera() {

    //const cameras = await getCamerasWithCapabilities();
    //const camera = getBestCamera(cameras);

    const constraints = {
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'environment'
        },
        audio: false,
    };

    stream = await navigator.mediaDevices.getUserMedia( constraints);

    video = document.querySelector("video");
    video.srcObject = stream;
    await video.play();

    height = video.videoHeight;
    width = video.videoWidth;
    video.setAttribute("width", width);
    video.setAttribute("height", height);

    //video.style.width = '100%';

    vc = new cv.VideoCapture(video);

    streaming = true;

    startVideoProcessing();
}


async function getCamerasWithCapabilities() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        const camerInfos = [];
        
        for(let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];

            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: camera.deviceId } });
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            console.log(capabilities);
            console.log(camera.label);

            camerInfos.push(capabilities);
        }

        return camerInfos;

    } catch (error) {
        console.error(error);
        return [];
    }    
}

function getBestCamera(cameras) {
    // sort cameras by facingMode. environment is prefered. Then sort by resolution (highest first) and get the id of the first camera
    const camera = cameras.sort((a, b) => {
        if(a.facingMode === 'environment') return -1;
        if(b.facingMode === 'environment') return 1;
        return b.width - a.width;
    })[0];
    return camera;
}

function startVideoProcessing() {
    if (!streaming) { console.warn("Please startup your webcam"); return; }
    stopVideoProcessing();
    src = new cv.Mat(height, width, cv.CV_8UC4);
    dstC1 = new cv.Mat(height, width, cv.CV_8UC1);
    dstC3 = new cv.Mat(height, width, cv.CV_8UC3);
    dstC4 = new cv.Mat(height, width, cv.CV_8UC4);
    intermediate = new cv.Mat(height, width, cv.CV_8UC4); // or the appropriate type

    requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
    if (src != null && !src.isDeleted()) src.delete();
    if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
    if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
    if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
    if (intermediate != null && !intermediate.isDeleted()) intermediate.delete();
}

function processVideo() {    
    vc.read(src);

    let result = zoomIntoMatCenter(src);
    //result = contours(result, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    result = contours(result, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
        
    cv.imshow("canvasOutput", result);
    
    requestAnimationFrame(processVideo);
}

function passThrough(src) {
    return src;
}

function zoomIntoMatCenter(mat) {

    zoomFactor = 4;

    // Preallocated Mat object for the zoomed image, assuming it's named dstC4
    // Ensure dstC4 is defined in the global scope or passed as a parameter

    // Calculate the center of the source image
    let centerX = src.cols / 2;
    let centerY = src.rows / 2;

    // Define the zoom region based on the zoom factor
    let width = src.cols / zoomFactor;
    let height = src.rows / zoomFactor;
    let x = centerX - width / 2;
    let y = centerY - height / 2;

    // Adjust the rectangle if it goes out of the image
    x = Math.max(x, 0);
    y = Math.max(y, 0);
    width = Math.min(width, src.cols - x);
    height = Math.min(height, src.rows - y);

    // Extract the region of interest (ROI)
    let rect = new cv.Rect(x, y, width, height);
    let roi = src.roi(rect);

    // Resize the extracted ROI to the size of dstC4
    let dsize = new cv.Size(src.cols, src.rows);
    cv.resize(roi, dstC4, dsize, 0, 0, cv.INTER_LINEAR);

    // Clean up the ROI Mat object
    roi.delete();

    // Return the zoomed image stored in dstC4
    return dstC4;
}

let contoursColor = [];
for (let i = 0; i < 10000; i++) {
    contoursColor.push([Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 0]);
}

function contoursXX(src, mode, method) {

    intermediate = src.clone();

    cv.cvtColor(intermediate, dstC1, cv.COLOR_RGBA2GRAY);
    cv.threshold(dstC1, dstC4, 120, 200, cv.THRESH_BINARY);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dstC4, contours, hierarchy, Number(mode), Number(method), { x: 0, y: 0 });
    dstC3.delete();
    dstC3 = cv.Mat.ones(height, width, cv.CV_8UC3);


    // for (let i = 0; i < contours.size(); ++i) {
    //     let color = contoursColor[i];
    //     cv.drawContours(dstC3, contours, i, color, 1, cv.LINE_8, hierarchy);
    // }
    // // display number of contours in info div
    // info.innerHTML = `Total contours found: ${contours.size()}`;

    let rects = 0;
    let areaThreshold = 10000;
    let minRectWidth = 400;
    let minRectHeight = 400;

    for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);

        let epsilon = 0.02 * cv.arcLength(contour, true);
        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);
    
        if (approx.rows === 4) {
            let contourArea = cv.contourArea(contour);
            let boundingRect = cv.boundingRect(contour);
            let width = boundingRect.width;
            let height = boundingRect.height;
    
            if (contourArea > areaThreshold && width > minRectWidth && height > minRectHeight) {
                let colorContour = new cv.Scalar(255, 0, 0); // Red color for contour
                cv.drawContours(src, contours, i, colorContour, 5, cv.LINE_8, hierarchy);

                // Draw the bounding rectangle
                let colorRect = new cv.Scalar(0, 255, 0); // Green color for bounding rectangle
                let point1 = new cv.Point(boundingRect.x, boundingRect.y);
                let point2 = new cv.Point(boundingRect.x + boundingRect.width, boundingRect.y + boundingRect.height);
                cv.rectangle(src, point1, point2, colorRect, 7, cv.LINE_AA, 0);

                rects++;
            }            
        }
    
        approx.delete();
    }

    info.innerHTML = `Total contours found: ${contours.size()} Rects: ${rects}`;



    // contours.delete(); hierarchy.delete();
    intermediate.delete();
    return src;
}


function contours(src, mode, method) {
    let intermediate = src.clone();

    // Initialize dstC1 and dstC4 locally
    let dstC1 = new cv.Mat(height, width, cv.CV_8UC1);
    let dstC4 = new cv.Mat(height, width, cv.CV_8UC4);

    // Convert to grayscale and apply threshold
    cv.cvtColor(intermediate, dstC1, cv.COLOR_RGBA2GRAY);
    cv.threshold(dstC1, dstC4, 120, 200, cv.THRESH_BINARY);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dstC4, contours, hierarchy, Number(mode), Number(method), { x: 0, y: 0 });

    let rects = 0;
    let areaThreshold = 1000;
    let minRectWidth = 100;
    let minRectHeight = 100;

    for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);

        let epsilon = 0.02 * cv.arcLength(contour, true);
        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);

        let colorContour = new cv.Scalar(0, 0, 255, 255); // Red color for contour
        cv.drawContours(src, contours, i, colorContour, 10, cv.LINE_8, hierarchy);
    
        if (approx.rows === 4) {
            let contourArea = cv.contourArea(contour);
            let boundingRect = cv.boundingRect(contour);
    
            if (contourArea > areaThreshold && boundingRect.width > minRectWidth && boundingRect.height > minRectHeight) {                

                // Draw the bounding rectangle
                let colorRect = new cv.Scalar(0, 255, 0, 255); // Green color for bounding rectangle
                let point1 = new cv.Point(boundingRect.x, boundingRect.y);
                let point2 = new cv.Point(boundingRect.x + boundingRect.width, boundingRect.y + boundingRect.height);
                cv.rectangle(src, point1, point2, colorRect, 40, cv.LINE_8, 0);

                rects++;
            }            
        }
    
        approx.delete();
    }

    info.innerHTML = `Total contours found: ${contours.size()} Rects: ${rects}`;

    // let testImage = new cv.Mat.zeros(height, width, cv.CV_8UC3);
    // let testColor = new cv.Scalar(0, 255, 0); // White color
    // let testPoint1 = new cv.Point(10, 10);
    // let testPoint2 = new cv.Point(100, 100);
    // cv.rectangle(testImage, testPoint1, testPoint2, testColor, 40, cv.LINE_8, 0);
    // cv.imshow("canvasOutput", testImage);

    // testImage.delete();
    
    // Check the output of testImage
    


    // Cleanup: delete all created Mats
    intermediate.delete();
    dstC1.delete();
    dstC4.delete();

    return src;
}
