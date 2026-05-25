import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';

const SelfieCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImg, setCapturedImg] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isAcceptable, setIsAcceptable] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isMirrored, setIsMirrored] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedDeviceId || devices.length === 0) {
      startCamera(selectedDeviceId);
    }
    return () => stopCamera();
  }, [selectedDeviceId]);

  const startCamera = async (deviceId = null) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Enumerate devices to populate the selector
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      
      // Remove DroidCam if there are other cameras available
      const cleanDevices = videoDevices.filter(d => !d.label.toLowerCase().includes('droidcam'));
      const availableDevices = cleanDevices.length > 0 ? cleanDevices : videoDevices;
      
      setDevices(availableDevices);
      
      // If we didn't specify a deviceId but we got one, select the first or current
      if (!deviceId && availableDevices.length > 0 && !selectedDeviceId) {
        // Find the one that's currently active (if not DroidCam) or just default
        const currentTrack = mediaStream.getVideoTracks()[0];
        const activeDevice = availableDevices.find(d => d.label === currentTrack.label) || availableDevices[0];
        setSelectedDeviceId(activeDevice.deviceId);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Please allow camera access to take a selfie.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw image
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        setCapturedImg(URL.createObjectURL(blob));
        analyzePhoto(file);
      }, 'image/jpeg', 0.8);
      
      stopCamera();
    }
  };

  const analyzePhoto = async (file) => {
    setAnalyzing(true);
    setFaceError('');
    
    try {
      if (!modelsLoaded) {
        // Fallback if models haven't loaded yet
        setIsAcceptable(true);
        canvasRef.current.file = file;
        setAnalyzing(false);
        return;
      }

      // Create image element to process
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => { img.onload = resolve; });

      const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true);
      
      if (detections.length === 0) {
        setFaceError("No face detected. Please ensure your face is clearly visible.");
        setIsAcceptable(false);
      } else if (detections.length > 1) {
        setFaceError("Multiple faces detected. Please ensure only you are in the frame.");
        setIsAcceptable(false);
      } else {
        const det = detections[0].detection;
        const landmarks = detections[0].landmarks;
        
        // Image dimensions
        const imgW = img.width;
        const imgH = img.height;
        
        // Face center
        const faceCenterX = det.box.x + det.box.width / 2;
        const faceCenterY = det.box.y + det.box.height / 2;
        
        // Check if face is roughly centered (middle 50% horizontally, middle 60% vertically)
        const isCenteredX = faceCenterX > imgW * 0.25 && faceCenterX < imgW * 0.75;
        const isCenteredY = faceCenterY > imgH * 0.20 && faceCenterY < imgH * 0.80;
        
        // Check face size (must take up ~30% to 60% of the image height to fill the oval)
        // Note: tinyFaceDetector bounding box only covers eyebrows to chin, not full head.
        const faceHeightRatio = det.box.height / imgH;
        const isTooFar = faceHeightRatio < 0.28;
        const isTooClose = faceHeightRatio > 0.65;

        // Calculate Eye Aspect Ratio (EAR) to detect closed eyes
        // Landmarks for left eye: 36-41, right eye: 42-47
        const getEAR = (eye) => {
          const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          const v1 = dist(eye[1], eye[5]);
          const v2 = dist(eye[2], eye[4]);
          const h = dist(eye[0], eye[3]);
          return (v1 + v2) / (2.0 * h);
        };

        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = getEAR(leftEye);
        const rightEAR = getEAR(rightEye);
        
        // Typical threshold for closed eyes is ~0.25 to 0.3
        const eyesClosed = leftEAR < 0.25 && rightEAR < 0.25;

        if (det.score < 0.5) {
          setFaceError("Face not clear enough. Please ensure good lighting.");
          setIsAcceptable(false);
        } else if (!isCenteredX || !isCenteredY) {
          setFaceError("Face is off-center. Please position your face inside the oval.");
          setIsAcceptable(false);
        } else if (isTooFar) {
          setFaceError("Face is too far away. Move closer until your face fills the oval.");
          setIsAcceptable(false);
        } else if (isTooClose) {
          setFaceError("Face is too close. Please move back slightly.");
          setIsAcceptable(false);
        } else if (eyesClosed) {
          setFaceError("Your eyes appear to be closed. Please open your eyes clearly.");
          setIsAcceptable(false);
        } else {
          setIsAcceptable(true);
          canvasRef.current.file = file;
        }
      }
    } catch (err) {
      console.error("Face detection failed:", err);
      // Fallback in case of an error so they aren't completely blocked
      setIsAcceptable(true);
      canvasRef.current.file = file;
    } finally {
      setAnalyzing(false);
    }
  };

  const retake = () => {
    setCapturedImg(null);
    setIsAcceptable(false);
    setFaceError('');
    startCamera(selectedDeviceId);
  };

  const confirm = async () => {
    if (canvasRef.current && canvasRef.current.file) {
      setIsSubmitting(true);
      try {
        await onCapture(canvasRef.current.file);
      } finally {
        setIsSubmitting(false); // Only needed if modal doesn't close immediately
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm ml-2">Live Selfie Verification</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Camera Area */}
        <div className="relative bg-slate-100 aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
          
          {!capturedImg ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />
              {/* Overlay mask for oval face guide */}
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-80 rounded-[100px] border-4 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none">
                <p className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-widest">
                  Position your face in the oval
                </p>
              </div>
            </>
          ) : (
            <>
              <img src={capturedImg} alt="Captured" className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`} />
              
              {analyzing && (
                <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                  </div>
                  <p className="text-white font-black uppercase tracking-widest text-xs">Analyzing Face...</p>
                </div>
              )}

              {isAcceptable && !analyzing && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-80 rounded-[100px] border-4 border-sky-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-all duration-500" />
                  <div className="absolute bottom-6 bg-sky-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg">
                    <Check size={14} strokeWidth={3} /> Image Acceptable
                  </div>
                </div>
              )}

              {faceError && !analyzing && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-80 rounded-[100px] border-4 border-rose-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-all duration-500" />
                  <div className="absolute bottom-6 bg-rose-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg text-center max-w-[80%]">
                    <AlertCircle size={14} strokeWidth={3} className="shrink-0" /> 
                    <span>{faceError}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-6 bg-white flex flex-col items-center space-y-4">
          {!capturedImg && devices.length > 1 && (
             <div className="w-full flex items-center gap-2 mb-2">
               <select 
                 className="flex-1 bg-gray-50 border border-gray-200 rounded-xl h-10 px-3 text-[10px] font-black uppercase tracking-widest text-gray-700 outline-none"
                 value={selectedDeviceId}
                 onChange={(e) => setSelectedDeviceId(e.target.value)}
               >
                 {devices.map((d, i) => (
                   <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                 ))}
               </select>
               <button 
                 onClick={() => setIsMirrored(!isMirrored)}
                 className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMirrored ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}
               >
                 {isMirrored ? 'Mirrored' : 'Normal'}
               </button>
             </div>
          )}

          {!capturedImg ? (
            <button 
              onClick={capturePhoto}
              className="w-16 h-16 bg-sky-500 rounded-full border-4 border-sky-100 shadow-xl flex items-center justify-center text-white hover:bg-sky-600 hover:scale-105 active:scale-95 transition-all"
            >
              <Camera size={24} />
            </button>
          ) : (
            <div className="flex gap-3 w-full">
               <button 
                onClick={retake}
                disabled={analyzing || isSubmitting}
                className="flex-1 h-14 bg-gray-100 text-gray-600 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} /> Retake
              </button>
              <button 
                onClick={confirm}
                disabled={analyzing || !isAcceptable || isSubmitting}
                className="flex-1 h-14 bg-sky-500 text-white rounded-[24px] shadow-2xl hover:bg-sky-600 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} 
                {isSubmitting ? 'Uploading...' : 'Use Photo'}
              </button>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default SelfieCamera;
