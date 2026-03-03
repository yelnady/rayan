import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
export function Lighting({ theme, roomWidth = 8, roomHeight = 4, roomDepth = 8, }) {
    return (_jsxs(_Fragment, { children: [_jsx("ambientLight", { color: theme.lightColor, intensity: theme.ambientIntensity }), _jsx("pointLight", { position: [roomWidth / 2, roomHeight - 0.3, roomDepth / 2], color: theme.lightColor, intensity: theme.lightIntensity, distance: roomWidth * 2.5, decay: 2, castShadow: true }), _jsx("pointLight", { position: [roomWidth / 2, 0.3, roomDepth / 2], color: theme.lightColor, intensity: theme.lightIntensity * 0.15, distance: roomWidth, decay: 2 })] }));
}
