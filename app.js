const gettingExpress = require('express');
const gettingExpressSession = require('express-session');
const {NodeSSH} = require('node-ssh');



/** server configuration */
const settingServerPort = 3000;
const settingServer = new gettingExpress();
const settingSSHClient = new NodeSSH();


/** session configuration */
const settingSessionConfig = {
    secret: 'session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {}
}
settingServer.set('trust proxy', 1);
if (settingServer.get('env') === 'production') {
  settingSessionConfig.cookie.secure = true
}
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


/** server api */
settingServer.post("/select-server", (gettingRequest, gettingResponse) => {
    const gettingHost = gettingRequest.headers["host"];
    const gettingPort = gettingRequest.headers["port"] ?? 22;
    const gettingUsername = gettingRequest.headers["username"];
    const gettingPassword = gettingRequest.headers["password"];
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
        message: gettingConnectionError
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