const { deleteImgCloudinary } = require("../../middleware/files.middleware");
const { enumPositionOk, enumPreferredFootOk } = require("../../utils/enumOk");
const Player = require("../models/Player.model");
const Team = require("../models/Team.model");

//! --------------- CREATE ----------------
const create = async (req, res, next) => {
    let catchImg = req.file?.path //? ------- capturamos la url de la img que se sube a cloudinary. El OPTIONAL CHAINING es porque la img no es obligatoria y puede que no haya imagen en la request
    try {
        await Player.syncIndexes() //? --------------------------- ACTUALIZAMOS INDEXES, que son aquellas claves del objeto que son únicas. Lo hacemos para asegurarnos que tenemos la última versión en caso de haber sido modificados los modelos
        const newPlayer = new Player(req.body) //? --------------------- instanciamos un nuevo jugador y le INTRODUCIMOS COMO INFO INICIAL LO QUE RECIBIMOS EN EL BODY DE LA REQUEST
        if (req.file) { //? -------------------- miramos si en la request hay imagen. Si la hay, la introducimos al nuevo jugador
            newPlayer.image = catchImg;
        } else {
            newPlayer.image = "https://s.hs-data.com/bilder/spieler/gross/619081.jpg?fallback=png"
        }

        const savePlayer = await newPlayer.save(); //? ---------------------- GUARDAMOS EL JUGADOR EN LA BASE DE DATOS (DB) O BACKEND
        //todo ----------------- INTENTO RECIPROCIDAD EN EL CREATE ---------------- 
        const id = savePlayer._id //? obtenemos el id a través de _id (FORMA PARA OBTENER EL ID)
        const playersTeam = req.body?.team
        if (playersTeam) {
            const updateTypes = await Team.findByIdAndUpdate(playersTeam, //? 1r param: el id del elemento que vamos a modificar (añadirle los players)
                {players: id} //? ------------------------------------------- 2o param: le metemos el id del jugador que estamos creando a la propiedad player del team que hemos puesto en el body
            )
        } //todo ------------------------------------------------------------------
        
        if (savePlayer) { //? si se ha guardado correctamente (savePlayer existe)
                res.status(200).json(savePlayer);
            } else {
                return res.status(404).json({message: "No se ha podido guardar el jugador en la DB ❌", error: error.message})
            }
        
    } catch (error) { //? --------------------------------------------- si ha habido un error creando el jugador: 
        req.file?.path ? deleteImgCloudinary(catchImg) : null; //? ---- hay que borrar la imagen, ya que ya se ha subido a cloudinary. Se ha hecho en la primera línea de esta función
        return res.status(404).json({
            message: "error en el creado del jugador ❌ - catch general",
            error: error.message
        }) && next(error)
    }
};

//! --------------- GET by ID ----------------
const getById = async (req, res, next) => {
    try {
        const {id} = req.params;
        const playerById = await Player.findById(id); //? cogemos el elemento (jugador) identificandola a través del id, que es único
        if (playerById) { //? --------------------------- si hay un elemento con dicho id
            return res.status(200).json(playerById);
        } else {
            return res.status(404).json("no se ha encontrado el jugador ❌") 
        }
    } catch (error) {
        return res.status(404).json({message: "error en el GET by ID ❌ - catch general", error: error.message})
    }
};

//! --------------- GET ALL ----------------
const getAll = async (req, res, next) =>  {
    try {
        const allPlayers = await Player.find() //? ------------- el find() nos devuelve un array con todos los elementos de la colección del BackEnd, es decir, TODOS LOS JUGADORES
        if (allPlayers.length > 0) {  //? --------------------------- SI HAY MOTOS:
            return res.status(200).json(allPlayers);
        } else {
            return res.status(404).json("no se han encontrado motos en la colección (BackEnd) ❌")
        }
    } catch (error) {
        return res.status(404).json({message: "error al buscar jugaddores en la colección ❌ - catch general", error: error.message});
    }
};

//! --------------- GET by NAME ----------------
const getByName = async (req, res, next) => {
    try {
        const {name} = req.params;
        const playerByName = await Player.find({name});
        if (playerByName.length > 0) {
            return res.status(200).json(playerByName);
        } else {
            return res.status(404).json("no se han encontrado jugadores a través de name ❌")
        }
    } catch (error) {
        return res.status(404).json({message: "error al buscar a través del name ❌ - catch general", error: error.message});
    }
};

//! --------------- UPDATE ----------------
const update = async (req, res, next) => {
    await Player.syncIndexes(); //? .------------------- busca las actualizaciones, por si se ha modficado el modelo player
    let catchImg = req.file?.path; //? ------- capturamos la url de la img que se sube a cloudinary. El OPTIONAL CHAINING es porque la img no es obligatoria y puede que no haya imagen en la request
    try {
        const {id} = req.params; //? ------------------- en esta linea y la siguiente hacemos lo mismo que en getById
        const playerById = await Player.findById(id);
        if (playerById) {
            const oldImg = playerById.image //? ------------- guardamos la imagen que había antes en el elemento
            
            const customBody = {
                _id: playerById._id, //? ---------- ponemos _.id porque así lo pone en insomnia
                image: req.file?.path ? catchImg : oldImg, //? -------------- si en el param hay una nueva imagen la ponemos en el lugar de la que había, si no hay una nueva, se deja la que había
                name: req.body?.name ? req.body.name : playerById.name,
                number: req.body?.number ? req.body.number : playerById.number,
                age: req.body?.age ? req.body.age : playerById.age,
                marketvalue: req.body?.marketvalue ? req.body.marketvalue : playerById.marketvalue,
                goals: req.body?.goals ? req.body.goals : playerById.goals,
                assists: req.body?.assists ? req.body.assists : playerById.assists,
                rating: req.body?.rating ? req.body.rating : playerById.rating,
            };

            //todo ---------------- ENUM (POSITION) -------------------
            if (req.body?.position) { //? si le mandamos la posición:
                const resultEnum = enumPositionOk(req.body?.position); //? checkea si el valor introducido coincide con el enum (enumOk en utils) y devuelve check: true/false
                customBody.position = resultEnum.check 
                    ? req.body?.position //? ----------------------------- si check es true, coge el valor ya que es válido
                    : playerById.position //? ---------------------------- si check es false, se queda con lo que tenía ya que el valor introducido no es el correcto del enum
            }
            //todo ---------------- ENUM (PREFERRED FOOT) -------------------
            if (req.body?.preferredfoot) {
                const resultEnum = enumPreferredFootOk(req.body?.preferredfoot);
                customBody.preferredfoot = resultEnum.check
                    ? req.body?.preferredfoot
                    : playerById.preferredfoot
            }
        
            try {
                await Player.findByIdAndUpdate(id, customBody); //? cambiamos el body con lo que hemos puesto en customBody en el elemento que encontremos con el id
                if (req.file?.path) {
                    deleteImgCloudinary(oldImg); //? -------------- eliminamos la imagen que había antes en la DB para no almacenar basura
                }
    //!           -------------------
    //!           | RUNTIME TESTING |
    //!           -------------------

                const playerByIdUpdated = await Player.findById(id) //? ---- buscamos el elemento actualizado a través del id
                const elementUpdate = Object.keys(req.body); //? ----------- buscamos los elementos de la request para saber qué se tiene que actualizar
                let test = []; //? ----------------------------------------- objeto vacío donde meter los tests. estará compuesta de las claves de los elementos y los valores seran true/false segun haya ido bien o mal

                elementUpdate.forEach((key) => { //? ----------------------------- recorremos las claves de lo que se quiere actualizar
                    if (req.body[key] === playerByIdUpdated[key]) { //? ---------- si el valor de la clave en la request (el valor actualizado que hemos pedido meter) es el mismo que el que hay ahora en el elemento ---> está bien
                        test[key] = true; //? ------------------------------------ está bien hecho por lo tanto en el test con la clave comprobada ponemos true --> test aprobado hehe
                    } else {
                        test[key] = false; //? ----------------------------------- algo ha fallado y por lo tanto el test está suspendido (false)
                    }
                });

                if (catchImg) {
                    playerByIdUpdated.image = catchImg //? ---------------- si la imagen en la request es la misma que la que hay ahora en el elemento
                        ? (test = { ...test, file: true}) //? ------------- hacemos una copia de test y le decimos que en file (foto) es true, ha ido bien
                        : (test = { ...test, file: false}) //? ------------ hacemos una copia de test y le decimos que en file (foto) es false, ha ido mal
                }

                let acc = 0
                for (clave in test) { //? -------------------- recorremos tests
                    test[clave] == false ? acc++ : null; //? - si el valor es false es que algo ha fallado y le sumamos al contador de fallos
                }
                
                if (acc > 0) { //? --------------------- si acc 1 o más, es que ha habido uno o más errores, y por lo tanto hay que notificarlo
                    return res.status(404).json({
                        dataTest: test, //? ------------ por aquí podremos examinar los errores viendo en qué claves se han producido
                        update: false
                    });
                } else {
                    return res.status(404).json({
                        dataTest: test,
                        update: true
                    })
                }
            } catch (error) {
                return res.status(404).json({message: "no se ha guardado el jugador updated correctamente ❌", error: error.message})
            }
        } else {
            return res.status(404).json("este jugador no existe ❌")
        }
    } catch (error) {
        return res.status(404).json({message: "error al actualizar datos del jugador (update) ❌ - catch general", error: error.message});
    }
};

//! --------------- DELETE ----------------
const deletePlayer = async (req, res, next) => {
    try {
        const {id} = req.params;
        const player = await Player.findByIdAndDelete(id); //? buscamos el jugador y lo eliminamos

        if (player) { //? si el jugador que queremos eliminar existe (tiene que hacerlo para poder eliminarlo)

            try { //? --------------------------------------- ELIMINAMOS AL JUGADOR DEL EQUIPO
                const test = await Team.updateMany( //? ----- ahora estamos cambiando en el model de Team para poder quitar el jugador que ya no existe
                    {players: id}, //? ---------------------- queremos cambiar lo que sea que haya que cambiar en esta propiedad del model, si se omite se dice que se cambia cualquier conincidencia en todo el modelo. es la condición
                    {$pull: {players: id}} //? -------------- estamos diciendo que quite de la propiedad players, el id indicado, es decir el del jugador que se ha eliminado. es la ejecución
                )
            } catch (error) {
                return res.status(404).json({message: "Error al eliminar el jugador del equipo ❌", error: error.message})
            }

            // try { //? -------------------------------------- ELIMINAMOS AL JUGADOR DEL USER
            //     const test = await User.updateMany( //? ---- ahora estamos cambiando en el model de User para poder quitar el jugador que ya no existe
            //         {favPlayers: id}, //? ------------------ condición/ubicación del cambio (eliminación)
            //         {$pull: {favPlayers: id}} //? ---------- ejecución
            //     )
            // } catch (error) {
            //     return res.status(404).json({message: "Error al eliminar el jugador del usuario ❌", error: error.message})
            // }

            const findByIdPlayer = await Player.findById(id); //? hemos encontrado este jugador? no debería existir porque lo hemos eliminado al ppio
            return res.status(findByIdPlayer ? 404 : 200).json({ //? si se encuentra hay un error, porque no se ha eliminado
                deleteTest: findByIdPlayer ? false : true, //? si existe, el test ha dado fallo y si no existe ha aprobado el test
            });
        } else {
            return res.status(404).json("este jugador no existe ❌"); //? si no existe el jugador antes de eliminarlo hay que dar error porque el jugador seleccionado para borrar no existia en un primer momento
        }
    } catch (error) {
        return res.status(404).json({message: "Error al eliminar el jugador ❌ - catch general", error: error.message});
    }
};

module.exports = {
    create,
    getById,
    getAll,
    getByName,
    update,
    deletePlayer
}