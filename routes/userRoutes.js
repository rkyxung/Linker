const express = require('express');
const router = express.Router();

const {
    getAllUsers,
    createUser,
    getUser,
    updateUser,
    deleteUser,
    addUserForm,
} = require("../controllers/userController");

router.route("/").get(getAllUsers);
router.route("/add").get(addUserForm).post(createUser);
router.route("/:id").get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;
