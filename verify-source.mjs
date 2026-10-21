import {verifyCandidate as verify} from './dist/lookup.mjs';
import {fetchPublic} from './public-fetch.mjs';
export {currentWebsites,documentEvidence} from './dist/lookup.mjs';
export const verifyCandidate=(input,options={})=>verify(input,{fetchPage:fetchPublic,...options});
