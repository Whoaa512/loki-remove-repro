var loki = require('lokijs')
  , _ = require('lodash')
  , bluebird = require('bluebird')
  , assert = require('assert')
  , db = bluebird.promisifyAll(new loki('queued-approvals.json', { autoload: true, autoloadCallback: autoloadCb }))
  , logger = {info: console.log}
  , queued = { data: [] }
  , approvals = { data: [] }
  , denials = { data: [] }
  , findQueuedBy
  , module = {
    moduleAndVersion: 'lodash@1.2.3',
    module: 'lodash',
    token: 'lodash@1.2.3_qOA2kyii7nv/aN5wyABpC0Ia2dtTKj/8eisPhm5XaHFBlykjvbyzGYoy2vGUqye/rrmb95n2kDDiayqZIBlOdA==',
    version: '1.2.3',
    submitter: 'carey.winslow@docusign.com',
    githubUri: 'dh',
    isPublicModule: false
  }

function run() {
  addModule(module, queued)
  var addedModule = findQueuedBy('lodash@1.2.3')
  moveModule(addedModule, queued, approvals)
  assert(approvals.data.length === 1, 'Module was not added to `approvals` collection')
  assert(queued.data.length === 0, 'Module was not removed from `queued` collection')
}

function addModule(mod, collection) {
  collection.insert(mod)
}

function moveModule(module, removeFrom, insertTo, metaData) {
  metaData = metaData || {}
  logger.info('Moving module', {
    to: insertTo.data
  , from: removeFrom.data
  , meta: metaData
  , module: module
  })
  removeFrom.remove(module) // Fails to remove here
  insertTo.insert(_.assign(metaData, _.omit(module, ['meta', '$loki', 'token'])))
}


function autoloadCb(err) {
  if (err) {
    if (/ENOENT, open 'queued-approvals\.json'/.test(err.message)) {
      logger.info('No db file found! Creating one...')
      db.save(collectionSetup)
    }
    else { logger.error('autoload err', err.message) }
  }
  else { collectionSetup() }
}

function collectionSetup() {
  var theOnlyIndexWeCareAbout = 'moduleAndVersion'

  // Populate top-level collection references
  queued = db.getCollection('queued') || db.addCollection('queued', { indicies: [theOnlyIndexWeCareAbout] })
  approvals = db.getCollection('approvals') || db.addCollection('approvals')
  denials = db.getCollection('denials') || db.addCollection('denials')

  // Setup unique index for fast lookups
  queued.ensureUniqueIndex(theOnlyIndexWeCareAbout)

  // Setup curried function to easily query later
  findQueuedBy = queued.by(theOnlyIndexWeCareAbout)

  logger.info('all approvals', _.map(approvals.data, theOnlyIndexWeCareAbout))
  logger.info('all denials', _.map(denials.data, theOnlyIndexWeCareAbout))
  logger.info('currently queued', _.map(queued.data, theOnlyIndexWeCareAbout))
  run()
}
