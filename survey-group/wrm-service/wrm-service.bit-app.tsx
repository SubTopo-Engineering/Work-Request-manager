import { NodeServer } from '@bitdev/node.node-server';

export default NodeServer.from({
  name: 'wrm-service',
  mainPath: import.meta.resolve('./wrm-service.app-root.js'),
});
