const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1' });

const ROLES = new Set(['Administrador', 'Jefe', 'Cajero', 'Consultor', 'Contador']);

const esAdministrador = async uid => {
    const token = await admin.auth().getUser(uid);
    return token.customClaims?.admin === true || token.customClaims?.rol === 'Administrador';
};

exports.asignarRol = onCall(async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    if (!(await esAdministrador(request.auth.uid))) {
        throw new HttpsError('permission-denied', 'Solo un administrador puede asignar roles.');
    }

    const { email, rol } = request.data || {};
    if (!email || !ROLES.has(rol)) {
        throw new HttpsError('invalid-argument', 'Correo o rol inválido.');
    }

    let usuario;
    try {
        usuario = await admin.auth().getUserByEmail(String(email).trim().toLowerCase());
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'El correo no existe en Firebase Authentication.');
        }
        throw error;
    }

    const claims = { ...(usuario.customClaims || {}), rol, admin: rol === 'Administrador' };
    await admin.auth().setCustomUserClaims(usuario.uid, claims);
    await admin.firestore().collection('usuarios').doc(usuario.uid).set({
        uid: usuario.uid,
        email: usuario.email,
        rol,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { uid: usuario.uid, email: usuario.email, rol };
});
