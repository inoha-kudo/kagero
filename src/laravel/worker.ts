import manifest from 'kagero/root-view';
import { kageroWorker } from '../worker';
import { rootView } from './root-view';

export default kageroWorker({
    version: manifest.version,
    rootView: rootView(manifest),
});
