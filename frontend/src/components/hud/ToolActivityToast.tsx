import { useVoiceStore } from '../../stores/voiceStore';

const TOOL_ICONS: Record<string, string> = {
    navigate_to_room: '🧭',
    highlight_artifact: '✨',
    save_artifact: '💾',
    end_session: '👋',
};

export function ToolActivityToast() {
    const toolActivity = useVoiceStore((s) => s.toolActivity);

    if (!toolActivity) return null;

    const icon = TOOL_ICONS[toolActivity.tool] ?? '⚙️';

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-hud pointer-events-none animate-[scaleIn_0.2s_ease]">
            <div className="flex items-center gap-2.5 bg-glass backdrop-blur-md border border-border rounded-[20px] px-4 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                <span className="text-base leading-none">{icon}</span>
                <span className="font-body text-[13px] text-text-primary tracking-wide whitespace-nowrap">
                    {toolActivity.label}
                </span>
            </div>
        </div>
    );
}
