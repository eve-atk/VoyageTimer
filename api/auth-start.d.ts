type RequestLike = {
    url?: string;
};
type ResponseLike = {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: string): void;
};
export default function handler(req: RequestLike, res: ResponseLike): void;
export {};
