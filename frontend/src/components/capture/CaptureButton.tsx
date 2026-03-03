import { useCapture } from '../../hooks/useCapture';
import { useCaptureStore } from '../../stores/captureStore';

interface CaptureButtonProps {
  source?: 'webcam' | 'screen_share';
}

export function CaptureButton({ source = 'webcam' }: CaptureButtonProps) {
  const { startCapture, stopCapture } = useCapture();
  const status = useCaptureStore((s) => s.status);

  const isCapturing = status === 'capturing';
  const isProcessing = status === 'processing';
  const disabled = isProcessing;

  function handleClick() {
    if (isCapturing) {
      stopCapture();
    } else {
      startCapture(source);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={isCapturing ? 'Stop capture' : 'Start capture'}
      style={{
        borderRadius: '50%',
        width: 64,
        height: 64,
        background: isCapturing ? '#e53935' : '#1976d2',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: '#fff',
        fontSize: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s',
      }}
    >
      {isProcessing ? '⏳' : isCapturing ? '⏹' : '⏺'}
    </button>
  );
}
