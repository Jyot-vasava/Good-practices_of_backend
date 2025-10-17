import { Router } from "express"
import { changeCurrentUserPassword,
     getCurrentUser,
      getUserChannelProfile,
       getWatchHistory,
        refreshAccessToken,
         registerUser,
         updateAccountDetails,
          updateUserAvatar,
           updateUserCover } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { loginUser , logoutUser } from "../controllers/user.controller.js"
import { verifyUser } from "../middlewares/auth.middlerware.js"

 

const router = Router()

router.route('/register').post(
    upload.fields([
        {name: 'avatar', maxCount: 1},
        {name: 'cover', maxCount: 1}
    ]),
    registerUser)

router.route('/login').post(loginUser)

//secured routes 

router.route('/logout').post(verifyUser, logoutUser)

router.route('/refresh-token').post(refreshAccessToken)

router.route('/change-password').post(verifyUser,changeCurrentUserPassword)

router.route('/current-user').get(verifyUser,getCurrentUser)

router.route('/update-account').patch(verifyUser,updateAccountDetails)

router.route("/avatar").patch(verifyUser, upload.single("avatar"),updateUserAvatar)

router.route("/cover").patch(verifyUser, upload.single("cover"), updateUserCover)

router.route('/c/:username').get(verifyUser,getUserChannelProfile)

router.route('/history').get(verifyUser,getWatchHistory)


export default router