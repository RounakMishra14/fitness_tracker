const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadModel() {
    return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
}

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

function drawResults(pose) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const keypoints = pose.keypoints;

    // Draw keypoints
    for (let i = 0; i < keypoints.length; i++) {
        const { x, y } = keypoints[i];
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
    }

    // Draw lines between keypoints
    const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
    adjacentKeyPoints.forEach((pair) => {
        const p1 = keypoints[pair[0]];
        const p2 = keypoints[pair[1]];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Calculate angles and provide feedback
    const shoulder = keypoints.find(k => k.name === 'left_shoulder');
    const elbow = keypoints.find(k => k.name === 'left_elbow');
    const wrist = keypoints.find(k => k.name === 'left_wrist');

    if (shoulder && elbow && wrist) {
        const angle = calculateAngle(shoulder, elbow, wrist);
        ctx.font = '18px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Angle: ${Math.round(angle)}`, elbow.x + 10, elbow.y - 10);

        const feedback = angle > 150 ? "Good form!" : "Adjust your arm!";
        ctx.fillText(feedback, 10, 30);
    }
}

async function main() {
    await setupCamera();
    const detector = await loadModel();

    video.play();

    async function detectPose() {
        const poses = await detector.estimatePoses(video);
        if (poses.length > 0) {
            drawResults(poses[0]);
        }
        requestAnimationFrame(detectPose);
    }

    detectPose();
}

main();
