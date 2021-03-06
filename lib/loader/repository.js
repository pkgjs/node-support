'use strict';

const GitUrlParse = require('git-url-parse');

const Logger = require('../logger');
const OctokitWrapper = require('./octokit-wrapper');
const Utils = require('../utils');


const internals = {
    cache: new Map()
};


exports.create = (repository) => {

    if (repository.split('/').length === 2) {
        repository = `https://github.com/${repository}`;
    }

    const parsedRepository = GitUrlParse(repository);

    return {
        getCommit: async () => {

            const simpleGit = Utils.simpleGit();
            const httpRepository = GitUrlParse.stringify(parsedRepository, 'http');
            const result = await simpleGit.listRemote([httpRepository, 'HEAD']);
            const [head] = result.split(/\s+/);

            return head;
        },
        loadFile: async (filename, options = {}) => {

            if (parsedRepository.source !== 'github.com') {
                throw new Error('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/detect-node-support');
            }

            const resource = `${parsedRepository.full_name}:${filename}@HEAD`;
            Logger.log(['loader'], 'Loading: %s', resource);

            const octokit = OctokitWrapper.create();

            try {

                let result;
                if (internals.cache.has(resource)) {
                    Logger.log(['loader'], 'From cache: %s', resource);
                    result = internals.cache.get(resource);
                }
                else {
                    result = await octokit.repos.getContent({
                        owner: parsedRepository.owner,
                        repo: parsedRepository.name,
                        path: filename
                    });
                }

                internals.cache.set(resource, result);

                Logger.log(['loader'], 'Loaded: %s', resource);

                const content = Buffer.from(result.data.content, 'base64');

                if (options.json) {
                    return JSON.parse(content.toString());
                }

                return content;
            }
            catch (err) {

                if (err.status === 404) {
                    Logger.log(['loader'], 'Not found: %s', resource);
                    const error = new Error(`${repository} does not contain a ${filename}`);
                    error.code = 'ENOENT';
                    throw error;
                }

                Logger.error(['loader'], 'Failed to load: %s', resource);
                throw err;
            }
        }
    };
};


exports.clearCache = () => {

    internals.cache = new Map();
};
