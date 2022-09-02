const express = require('express');
const router = express.Router();
const monitor = require('../lib/monitoring');
const Device = require('../controllers/ngsi-ld/device');
const Farm = require('../controllers/ngsi-ld/farm');
const Person = require('../controllers/ngsi-ld/person');
const History = require('../controllers/history');
const DeviceListener = require('../controllers/iot/command-listener');
const Security = require('../controllers/security');
const _ = require('lodash');

const TRANSPORT = process.env.DUMMY_DEVICES_TRANSPORT || 'HTTP';
const DEVICE_PAYLOAD = process.env.DUMMY_DEVICES_PAYLOAD || 'ultralight';
const GIT_COMMIT = process.env.GIT_COMMIT || 'unknown';
const SECURE_ENDPOINTS = process.env.SECURE_ENDPOINTS || false;
const AUTHZFORCE_ENABLED = process.env.AUTHZFORCE_ENABLED || false;

const NOTIFY_ATTRIBUTES = ['controlledAsset', 'type', 'filling', 'humidity', 'temperature'];

const numberOfPigs = process.env.PIG_COUNT || 5;

const NGSI_LD_FARMS = [
    {
        href: 'app/farm/urn:ngsi-ld:Building:farm001',
        name: 'Farm 1'
    },
    {
        href: 'app/farm/urn:ngsi-ld:Building:farm002',
        name: 'Farm 2'
    },
    {
        href: 'app/farm/urn:ngsi-ld:Building:farm003',
        name: 'Farm 3'
    },
    {
        href: 'app/farm/urn:ngsi-ld:Building:farm004',
        name: 'Farm 4'
    }
];

// Error handler for async functions
function catchErrors(fn) {
    return (req, res, next) => {
        return fn(req, res, next).catch(next);
    };
}

// If an subscription is recieved emit socket io events
// using the attribute values from the data received to define
// who to send the event too.
function broadcastEvents(req, item, types) {
    const message = req.params.type + ' received';
    _.forEach(types, (type) => {
        if (item[type]) {
            monitor(item[type], message);
        }
    });
}

// Handles requests to the main page
router.get('/', function (req, res) {
    const securityEnabled = SECURE_ENDPOINTS;
    const buildings = NGSI_LD_FARMS;
    res.render('index', {
        success: req.flash('success'),
        errors: req.flash('error'),
        info: req.flash('info'),
        securityEnabled,
        buildings,
        ngsi: 'ngsi-ld'
    });
});

// Logs users in and out using Keyrock.
router.get('/login', Security.logInCallback);
router.get('/clientCredentials', Security.clientCredentialGrant);
router.get('/implicitGrant', Security.implicitGrant);
router.post('/userCredentials', Security.userCredentialGrant);
router.post('/refreshToken', Security.refreshTokenGrant);
router.get('/authCodeGrant', Security.authCodeGrant);
router.get('/logout', Security.logOut);

router.get('/version', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({ gitHash: GIT_COMMIT });
});

// Render the monitoring page
router.get('/device/monitor', function (req, res) {
    const traffic = TRANSPORT === 'HTTP' ? 'Northbound Traffic' : 'MQTT Messages';
    const title = 'IoT Devices (' + DEVICE_PAYLOAD + ' over ' + TRANSPORT + ')';
    const securityEnabled = SECURE_ENDPOINTS;
    res.render('device-monitor', {
        title,
        traffic,
        securityEnabled
    });
});

// Access to IoT devices is secured by a Policy Decision Point (PDP).
// LEVEL 1: AUTHENTICATION ONLY -  For most actions, any user is authorized, just ensure the user exists.
// LEVEL 2: BASIC AUTHORIZATION -  Ringing the alarm bell and unlocking the Door are restricted to certain
//                                 users.
// LEVEL 3: XACML AUTHORIZATION -  Ringing the alarm bell and unlocking the Door are restricted via XACML
//                                 rules to certain users at certain times of day.
router.post('/device/command', DeviceListener.accessControl, DeviceListener.sendCommand);

// Retrieve Device History from STH-Comet
if (process.env.STH_COMET_SERVICE_URL) {
    router.get('/device/history/:deviceId', catchErrors(History.readCometDeviceHistory));
}
// Retrieve Device History from Crate-DB
if (process.env.CRATE_DB_SERVICE_URL) {
    router.get('/device/history/:deviceId', catchErrors(History.readCrateDeviceHistory));
}

// Display the app monitor page
router.get('/app/monitor', function (req, res) {
    res.render('monitor', { title: 'Event Monitor' });
});

// Display the app monitor page
router.get('/device/history', function (req, res) {
    const data = NGSI_LD_FARMS;
    const stores = [];

    if (process.env.CRATE_DB_SERVICE_URL || process.env.STH_COMET_SERVICE_URL) {
        
        for (let i = 1; i <= numberOfPigs; i++) {
            stores.push({
                name: ('Device' + i.toString().padStart(3, '0')),
                href: ('history/' + i.toString().padStart(3, '0'))
            });
        }
    }
    res.render('history-index', {
        title: 'Short-Term History',
        stores
    });
});

// Viewing Store information is secured by Keyrock PDP.
// LEVEL 1: AUTHENTICATION ONLY - Users must be logged in to view the store page.
router.get('/app/farm/:id', Security.authenticate, Farm.display);
router.get('/app/person/:id', Security.authenticate, Person.display);
router.get('/app/device-details/:id', Security.authenticate, Device.display);
// Display products for sale
router.get('/app/farm/:id/till', Farm.displayTillInfo);
// Render warehouse notifications
router.get('/app/farm/:id/warehouse', Farm.displayWarehouseInfo);
// Buy something.
router.post('/app/inventory/:inventoryId', catchErrors(Farm.buyItem));

// Changing Prices is secured by a Policy Decision Point (PDP).
// LEVEL 2: BASIC AUTHORIZATION - Only managers may change prices - use Keyrock as a PDP
// LEVEL 3: XACML AUTHORIZATION - Only managers may change prices are restricted via XACML
//                                - use Authzforce as a PDP
router.get(
    '/app/price-change',
    function (req, res, next) {
        // Use Advanced Autorization if Authzforce is present.
        return AUTHZFORCE_ENABLED
            ? Security.authorizeAdvancedXACML(req, res, next)
            : Security.authorizeBasicPDP(req, res, next);
    },
    Farm.priceChange
);
// Ordering Stock is secured by a Policy Decision Point (PDP).
// LEVEL 2: BASIC AUTHORIZATION - Only managers may order stock - use Keyrock as a PDP
// LEVEL 3: XACML AUTHORIZATION - Only managers may order stock are restricted via XACML
//                                - use Authzforce as a PDP
router.get(
    '/app/order-stock',
    function (req, res, next) {
        // Use Advanced Authorization if Authzforce is present.
        return AUTHZFORCE_ENABLED
            ? Security.authorizeAdvancedXACML(req, res, next)
            : Security.authorizeBasicPDP(req, res, next);
    },
    Farm.orderStock
);

// Whenever a subscription is received, display it on the monitor
// and notify any interested parties using Socket.io
router.post('/subscription/:type', (req, res) => {
    monitor('notify', req.params.type + ' received', req.body);
    _.forEach(req.body.data, (item) => {
        broadcastEvents(req, item, NOTIFY_ATTRIBUTES);
    });
    res.status(204).send();
});

module.exports = router;
