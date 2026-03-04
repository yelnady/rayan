import React from 'react';

interface EnrichmentImageProps {
    url: string;
    caption: string;
}

export function EnrichmentImage({ url, caption }: EnrichmentImageProps) {
    const [errored, setErrored] = React.useState(false);

    if (errored) {
        return (
            <div className="flex flex-col items-center justify-center gap-1.5 py-5 px-3 bg-[rgba(255,255,255,0.04)] rounded-md">
                <span className="text-[28px]">🖼</span>
                <span className="text-text-faint text-[11px] font-body leading-[1.4]">{caption}</span>
            </div>
        );
    }

    return (
        <figure className="m-0 flex flex-col gap-1">
            <img
                src={url}
                alt={caption}
                className="w-full aspect-video object-cover rounded-md bg-[rgba(255,255,255,0.04)]"
                onError={() => setErrored(true)}
                loading="lazy"
            />
            {caption && (
                <figcaption className="text-text-faint text-[11px] font-body leading-[1.4]">{caption}</figcaption>
            )}
        </figure>
    );
}
