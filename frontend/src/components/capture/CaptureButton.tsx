import { useCapture } from '../../hooks/useCapture';
import { useCaptureStore } from '../../stores/captureStore';
import { colors, radii, transitions } from '../../config/tokens';

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
        borderRadius: radii.pill,
        width: 64,
        height: 64,
        background: isCapturing ? colors.errorSolid : colors.primary,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: colors.white,
        fontSize: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: `background ${transitions.normal}, opacity ${transitions.fast}`,
        boxShadow: isCapturing
          ? `0 0 0 6px rgba(239,68,68,0.25), 0 4px 16px rgba(0,0,0,0.4)`
          : `0 4px 16px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.3)`,
      }}
    >
      {isProcessing ? '⏳' : isCapturing ? '⏹' : '⏺'}
    </button>
  );
}
