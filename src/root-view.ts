export type Manifest = {
    version?: string;
    pages?: Record<string, string>;
    fonts?: string;
};

export default ((): Manifest => {
    throw new Error(
        '"kagero/root-view" is not aliased to the generated root view manifest.',
    );
})();
