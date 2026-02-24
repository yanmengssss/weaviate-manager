import weaviate, { WeaviateClient } from 'weaviate-client';

export async function getWeaviateClient(url: string, apiKey?: string): Promise<WeaviateClient> {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const portStr = urlObj.port;
        const scheme = urlObj.protocol.replace(':', '');
        const isSecure = scheme === 'https';
        const httpPort = portStr ? parseInt(portStr, 10) : isSecure ? 443 : 8080;

        // Weaviate gRPC default port is 50051 (commonly), do not derive from HTTP
        // We only pass hostname (no port) and explicit httpPort to avoid double-colon like :8081:8080

        let client: WeaviateClient;

        // Simplify connection by using the host and protocol directly
        // Weaviate v3 client connectToCustom allows specifying both HTTP and GRPC
        const customParams: any = {
            httpHost: hostname,
            httpPort: httpPort,
            httpSecure: isSecure,
            grpcHost: hostname,
            grpcSecure: isSecure,
        };

        if (apiKey) {
            // Using standard v3 auth credentials configuration
            customParams.authCredentials = new weaviate.ApiKey(apiKey);
        }

        // Connect to custom endpoint
        client = await weaviate.connectToCustom(customParams);
        return client;
    } catch (error) {
        console.error("Failed to initialize Weaviate client:", error);
        throw error;
    }
}
