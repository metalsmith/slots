import { Plugin } from 'metalsmith';

export default slots;
export type Options = {
    key: string;
};
/**
 * A Metalsmith plugin to divide file contents in slots, associate metadata with them and process them separately
 */
declare function slots(options: Options): Plugin;
