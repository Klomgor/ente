type LottiePoint = [number, number];

interface LottieShapePath {
    c: boolean;
    i: LottiePoint[];
    o: LottiePoint[];
    v: LottiePoint[];
}

export interface ParsedArrowPath {
    color: string;
    d: string;
    lineCap: "butt" | "round" | "square";
    lineJoin: "miter" | "round" | "bevel";
    name: string;
    strokeScale: number;
    width: number;
}

export interface ParsedArrow {
    height: number;
    paths: ParsedArrowPath[];
    transform: string;
    width: number;
}

const safePoint = (point?: LottiePoint): [number, number] => [
    point?.[0] ?? 0,
    point?.[1] ?? 0,
];

const toPathD = (shape: LottieShapePath) => {
    if (!shape?.v?.length) return "";

    const { c, i, o, v } = shape;
    const [startX, startY] = safePoint(v[0]);
    let d = `M ${startX} ${startY}`;

    for (let idx = 1; idx < v.length; idx++) {
        const [prevX, prevY] = safePoint(v[idx - 1]);
        const [currX, currY] = safePoint(v[idx]);
        const [prevOutX, prevOutY] = safePoint(o[idx - 1]);
        const [currInX, currInY] = safePoint(i[idx]);
        const hasCurve =
            prevOutX !== 0 || prevOutY !== 0 || currInX !== 0 || currInY !== 0;

        if (hasCurve) {
            d += ` C ${prevX + prevOutX} ${prevY + prevOutY} ${
                currX + currInX
            } ${currY + currInY} ${currX} ${currY}`;
        } else {
            d += ` L ${currX} ${currY}`;
        }
    }

    if (c) {
        const lastIdx = v.length - 1;
        const [prevX, prevY] = safePoint(v[lastIdx]);
        const [currX, currY] = safePoint(v[0]);
        const [prevOutX, prevOutY] = safePoint(o[lastIdx]);
        const [currInX, currInY] = safePoint(i[0]);
        const hasCurve =
            prevOutX !== 0 || prevOutY !== 0 || currInX !== 0 || currInY !== 0;

        if (hasCurve) {
            d += ` C ${prevX + prevOutX} ${prevY + prevOutY} ${
                currX + currInX
            } ${currY + currInY} ${currX} ${currY}`;
        } else {
            d += ` L ${currX} ${currY}`;
        }
        d += " Z";
    }

    return d;
};

const toLineCap = (value: number): ParsedArrowPath["lineCap"] =>
    value === 2 ? "round" : value === 3 ? "square" : "butt";

const toLineJoin = (value: number): ParsedArrowPath["lineJoin"] =>
    value === 2 ? "round" : value === 3 ? "bevel" : "miter";

const toRGB = (rgb: number[]) => {
    const r = Number(rgb?.[0] ?? 1);
    const g = Number(rgb?.[1] ?? 1);
    const b = Number(rgb?.[2] ?? 1);
    return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
};

export const parseArrowLottie = (lottie: any): ParsedArrow | null => {
    const layer = lottie?.layers?.[0];
    if (!layer?.shapes?.length) return null;

    const sx = (Number(layer?.ks?.s?.k?.[0] ?? 100) || 100) / 100;
    const sy =
        (Number(layer?.ks?.s?.k?.[1] ?? layer?.ks?.s?.k?.[0] ?? 100) || 100) /
        100;
    const px = Number(layer?.ks?.p?.k?.[0] ?? 0) || 0;
    const py = Number(layer?.ks?.p?.k?.[1] ?? 0) || 0;

    const paths: ParsedArrowPath[] = [];
    for (const group of layer.shapes) {
        if (group?.ty !== "gr" || !Array.isArray(group?.it)) continue;

        const shape = group.it.find((item: any) => item?.ty === "sh")?.ks?.k as
            | LottieShapePath
            | undefined;
        const stroke = group.it.find((item: any) => item?.ty === "st");
        if (!shape || !stroke) continue;
        const groupName = String(group?.nm ?? "");
        const d = toPathD(shape);
        if (!d) continue;

        paths.push({
            color: toRGB(stroke?.c?.k),
            d,
            lineCap: toLineCap(Number(stroke?.lc ?? 1)),
            lineJoin: toLineJoin(Number(stroke?.lj ?? 1)),
            name: groupName,
            strokeScale: 0.58,
            width: Number(stroke?.w?.k ?? 2),
        });
    }

    if (!paths.length) return null;

    return {
        height: Number(lottie?.h ?? 84) || 84,
        paths,
        transform: `translate(${px} ${py}) scale(${sx} ${sy})`,
        width: Number(lottie?.w ?? 150) || 150,
    };
};
