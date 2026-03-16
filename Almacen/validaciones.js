import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Verifica si un valor ya existe en un campo específico de la colección productos
 * @param {object} db - Instancia de Firestore
 * @param {string} campo - El campo a buscar ('idSecuencial' o 'codigo')
 * @param {string} valor - El valor a validar
 * @param {string} idActual - El ID del documento actual (opcional, para cuando editamos)
 */
export async function existeDuplicado(db, campo, valor, idActual = null) {
    if (!valor || valor === "S/C") return false; // No validar si está vacío o es Sin Código

    const q = query(collection(db, "productos"), where(campo, "==", valor));
    const querySnapshot = await getDocs(q);

    let existe = false;
    querySnapshot.forEach((doc) => {
        // Si estamos editando, ignoramos el documento que ya tenemos abierto
        if (idActual && doc.id === idActual) return;
        existe = true;
    });

    return existe;
}