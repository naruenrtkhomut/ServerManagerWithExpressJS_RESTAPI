const gettingExpress = require('express');
const gettingExpressSession = require('express-session');
const {NodeSSH} = require('node-ssh');
const gettingBodyParser = require('body-parser');
const gettingCors = require('cors');



/** server configuration */
const settingServerPort = 3000;
const settingServer = new gettingExpress();
const settingSSHClient = new NodeSSH();

const settingBodyJson = gettingBodyParser.json()

/** session configuration */
settingServer.use(gettingCors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['POST', 'PUT', 'GET', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const settingSessionConfig = {
    secret: 'session-secret',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax'
    }
}
settingServer.set('trust proxy', 1);
settingServer.use(gettingExpressSession(settingSessionConfig));


/** ssh connection function */
const fncSSHConnection = (gettingRequest, gettingResponse, gettingCommand, gettingStdIN) => {
    const gettingHost = (gettingRequest.session.server ?? {}).host ?? null;
    const gettingPort = (gettingRequest.session.server ?? {}).port ?? 22;
    const gettingUsername = (gettingRequest.session.server ?? {}).username ?? null;
    const gettingPassword = (gettingRequest.session.server ?? {}).password ?? null;
    const settingSSHConnection = {
        host: gettingHost,
        port: gettingPort,
        username: gettingUsername,
        password: gettingPassword
    }
    let sshStdIN = {}
    if (gettingStdIN !== null) {
        sshStdIN.stdin = gettingStdIN;
    }
    settingSSHClient.connect(settingSSHConnection)
    .then(() => {
        settingSSHClient.execCommand(gettingCommand, sshStdIN)
        .then((gettingCommandResult) => {
            settingSSHClient.dispose();
            gettingResponse.send({
                result: 'OK',
                message: {
                    error: gettingCommandResult.stderr.split('\n').map(gettingData => gettingData.trim()).filter(gettingData => gettingData !== ''),
                    out: gettingCommandResult.stdout.split('\n').map(gettingData => gettingData.trim()).filter(gettingData => gettingData !== '')
                }
            });
        })
        .catch((gettingCommandError) => gettingResponse.send({
            result: "Getting ssh command error",
            message: gettingCommandError
        }));
    })
    .catch((gettingConnectionError) => gettingResponse.send({
        result: "Getting ssh connection error",
        message: gettingConnectionError
    }));
}

/** header */
settingServer.use((gettingRequest, gettingResponse, gettingNext) => {
    gettingResponse.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
    gettingResponse.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    gettingResponse.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    gettingResponse.setHeader('Access-Control-Allow-Credentials', true);
    gettingNext();
});


/** server api */
settingServer.post("/select-server", settingBodyJson, (gettingRequest, gettingResponse) => {
    const gettingBody = gettingRequest.body ?? {};
    const gettingHost = gettingBody.host;
    const gettingPort = gettingBody.port ?? 22;
    const gettingUsername = gettingBody.username;
    const gettingPassword = gettingBody.password;
    const settingSSHConnection = {
        host: gettingHost,
        port: gettingPort,
        username: gettingUsername,
        password: gettingPassword
    }
    settingSSHClient.connect(settingSSHConnection)
    .then(() => {
        gettingRequest.session.server = settingSSHConnection;
        settingSSHClient.dispose();
        gettingResponse.send({
            result: "OK",
            message: settingSSHConnection
        });
    })
    .catch((gettingConnectionError) => gettingResponse.send({
        result: "SSH connection error",
        message: gettingConnectionError,
        header: gettingRequest.headers,
        body: gettingBody
    }));
});
settingServer.post("/command", (gettingRequest, gettingResponse) => {
    const gettingCommand = gettingRequest.headers["command"];
    const gettingStdIN = gettingRequest.headers["stdin"];
    if ((gettingRequest.session.server ?? {}).host) fncSSHConnection(gettingRequest, gettingResponse, gettingCommand, gettingStdIN);
    else gettingResponse.send({ result: "FAIL", message: gettingRequest.session.server ?? {} });
});
settingServer.post("/check", (gettingRequest, gettingResponse) => {
    if ((gettingRequest.session.server ?? {}).host) {
        const gettingHost = (gettingRequest.session.server ?? {}).host ?? null;
        const gettingPort = (gettingRequest.session.server ?? {}).port ?? 22;
        const gettingUsername = (gettingRequest.session.server ?? {}).username ?? null;
        const gettingPassword = (gettingRequest.session.server ?? {}).password ?? null;
        const settingSSHConnection = {
            host: gettingHost,
            port: gettingPort,
            username: gettingUsername,
            password: gettingPassword
        }
        settingSSHClient.connect(settingSSHConnection)
        .then(() => {
            settingSSHClient.dispose();
            gettingResponse.send({result: "OK", message: "success"});
        })
        .catch((gettingConnectionError) => gettingResponse.send({result: "Get connection error", message: gettingConnectionError}));
    }
    else gettingResponse.send({result: "FAIL", message: "No register server"});
});

/** server is running */
settingServer.listen(settingServerPort, () => console.log("Server is running on port: 3000"));