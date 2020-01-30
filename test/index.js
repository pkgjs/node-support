'use strict';

const Fs = require('fs');
const Nock = require('nock');
const Path = require('path');
const Sinon = require('sinon');
const Tmp = require('tmp');

const NodeSupport = require('..');


const { describe, it, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');


const internals = {
    tmpObjects: []
};

internals.prepareFixture = ({ travisYml, packageJson } = {}) => {

    const tmpObj = Tmp.dirSync({ unsafeCleanup: true });

    internals.tmpObjects.push(tmpObj);

    if (travisYml) {
        Fs.copyFileSync(Path.join(__dirname, 'fixtures', travisYml), Path.join(tmpObj.name, '.travis.yml'));
    }

    Fs.writeFileSync(Path.join(tmpObj.name, 'package.json'), JSON.stringify(packageJson || {
        name: 'test-module',
        version: '0.0.0-development'
    }));

    return tmpObj.name;
};


describe('node-support', () => {

    beforeEach(() => {

        Sinon.useFakeTimers(new Date('2020-02-02T20:00:02Z'));
    });

    afterEach(() => {

        internals.tmpObjects.forEach((tmpObj) => {

            tmpObj.removeCallback();
        });

        internals.tmpObjects = [];

        Sinon.restore();
    });

    describe('detect()', () => {

        describe('path', () => {

            it('returns node versions from `.travis.yml` at the path', async () => {

                const path = Path.join(__dirname, '..');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'node-support',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13']
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                const path = internals.prepareFixture();

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000
                });
            });

            it('returns the single node version', async () => {

                const path = internals.prepareFixture({
                    travisYml: '_single-version.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10']
                    }
                });
            });

            it('returns default node version', async () => {

                const path = internals.prepareFixture({
                    travisYml: '_minimal.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['latest']
                    }
                });
            });

            it('returns empty array when no node detected', async () => {

                const path = internals.prepareFixture({
                    travisYml: '_no-node.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: []
                    }
                });
            });

            it('returns node versions from matrix env vars (NODEJS_VER)', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'kangax-html-minifier.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['6', '8', '10', 'latest']
                    }
                });
            });

            it('returns node versions from matrix env vars (TRAVIS_NODE_VERSION)', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'nodejs-nan.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['0.10', '0.12', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'lts/*']
                    }
                });
            });

            it('returns node versions from matrix env vars (NODE_VER)', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'reactivex-rxjs.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['4', '6', '7']
                    }
                });
            });

            it('handles non-matching matrix env vars', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'caolan-async.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['8', '10', '12']
                    }
                });
            });

            it('returns node versions from matrix include', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'nodejs-readable-stream.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['6', '8', '9', '10', '12', 'stable']
                    }
                });
            });

            it('handles single matrix include', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'postcss-autoprefixer.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['node', '10', '12', '8', '6']
                    }
                });
            });

            it('handles matrix includes without node versions', async () => {

                const path = internals.prepareFixture({
                    travisYml: 'shinn-is-resolvable.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['node']
                    }
                });
            });

            it('handles missing env.matrix', async () => {

                const path = internals.prepareFixture({
                    travisYml: '_no-env-matrix.yml'
                });

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['latest']
                    }
                });
            });
        });


        describe('repository', () => {

            beforeEach(() => {

                if (!Nock.isActive()) {
                    Nock.activate();
                }
            });

            afterEach(() => {

                Nock.restore();
                Nock.cleanAll();
            });

            it('returns node versions from `.travis.yml` in the repository', async () => {

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                const result = await NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/node-support.git' });

                expect(result).to.equal({
                    name: 'node-support',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13']
                    },
                    engines: '>=10'
                });
            });

            it('throws when a package does not live on public github.com', async () => {

                await expect(NodeSupport.detect({ repository: 'git+https://github.example.com/pkgjs/node-support.git' }))
                    .to.reject('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/node-support');
            });
        });
    });
});
