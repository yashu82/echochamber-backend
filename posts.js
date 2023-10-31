require('dotenv').config();
const generateUniqueId = require('generate-unique-id');
const { MongoClient } = require('mongodb');
const url = process.env.MONGO_URL;
const client = new MongoClient(url);
client.connect();
const dataBase = process.env.MONGO_DB
const userCred = process.env.MONGO_USER_CRED
const userData = process.env.MONGO_USER_DATA
const commonData = process.env.MONGO_DATA

async function postuser(data) {
    const db = client.db(dataBase);
    const coll = db.collection(userCred);
    const coll1 = db.collection(userData);
    const coll2 = db.collection(commonData);
    try {
        {
            const uniqueId = generateUniqueId()
            let finalDataUser = {
                post: data.post,
                likes: [],
                comments: [],
                date: data.date,
                gender: data.gender,
                uniqueId: uniqueId
            }
            const storeUserData = await coll1.updateOne(
                { username: data.username },
                { $push: { posts: finalDataUser } }
            )
            const storeCommomData = await coll2.insertOne(
                {
                    post: data.post,
                    likes: [],
                    comments: [],
                    date: data.date,
                    gender: data.gender,
                    username: data.username,
                    uniqueId: uniqueId
                }
            )
            if (storeUserData.acknowledged && storeCommomData.acknowledged)
                return true
            else
                return false
        }
    }
    catch (err) {
        console.log('err');
    }
}



async function getPosts(message, res) {
    try {
        const db = client.db(dataBase);
        const coll2 = db.collection(commonData);
        let data = await coll2.find({}).toArray();
        if (message.username === '') {
            let finalData = data.map(element => (
                {
                    ...element,
                    likeCount: (element.likes).length,
                    commentCount: (element.comments).length,
                    liked: false
                }
            ))
            res.json(finalData.reverse());
        }
        else {
            let finalData = data.map(element => {

                let likeCheck = (element.likes).filter((item) => (item == message.username))
                if (likeCheck.length > 0)
                    likeCheck = true
                else
                    likeCheck = false

                return ({
                    ...element,
                    likeCount: (element.likes).length,
                    commentCount: (element.comments).length,
                    liked: likeCheck
                })
            }
            )
            res.json(finalData.reverse());
        }

    }
    catch (err) {
        console.log('err');
    }
}



async function likePost(message, res) {
    try {
        const db = client.db(dataBase);
        const coll1 = db.collection(userData);
        const coll2 = db.collection(commonData);
        let userPostNum;
        const fetchData = await coll1.findOne({ username: message.postUsername })
        if (fetchData !== null) {
            const findPost = (fetchData.posts).find((item, index) => {
                if (item.uniqueId === message.id) {
                    userPostNum = index;
                    return item
                }
            })
            const checkLike = (findPost.likes).filter(item => (item === message.myUsername))

            if (checkLike.length > 0) {
                //removing Like
                let rmLikeAll = await coll2.updateOne(
                    { uniqueId: message.id },
                    { $pull: { likes: message.myUsername } }
                )
                let rmLikeUser = await coll1.updateOne({ username: message.postUsername }, {
                    $pull: { [`posts.${userPostNum}.likes`]: message.myUsername }
                })
                // console.log(rmLikeAll.acknowledged && rmLikeUser.acknowledged);
                getStats(message, res)
            }
            else {
                //adding Like
                let addLikeAll = await coll2.updateOne(
                    { uniqueId: message.id },
                    { $push: { likes: message.myUsername } }
                )
                let addLikeUser = await coll1.updateOne({ username: message.postUsername }, {
                    $push: { [`posts.${userPostNum}.likes`]: message.myUsername }
                })
                // console.log(addLikeAll.acknowledged && addLikeUser.acknowledged);
                getStats(message, res)
            }

        }

    }
    catch (err) {
        console.log(err);
    }
}



async function getStats(message, res) {
    try {
        const db = client.db(dataBase);
        const coll2 = db.collection(commonData);
        const data = await coll2.findOne({ uniqueId: message.id })
        const checkLike = (data.likes).filter(item => (item === message.myUsername))
        let liked;
        if (checkLike.length > 0)
            liked = true
        else
            liked = false
        res.json({ likes: data.likes, comments: data.comments, likeCount: (data.likes).length, commentCount: (data.comments).length, liked: liked })
    }
    catch (e) {
        console.log('e');
    }
}


async function commentPost(message, res) {
    const uniqueId = generateUniqueId()
    try {
        const db = client.db(dataBase);
        const coll1 = db.collection(userData);
        const coll2 = db.collection(commonData);
        let commentAll;
        commentAll = await coll2.updateOne(
            { uniqueId: message.id },
            {
                $push: {
                    comments: {
                        uniqueId: uniqueId,
                        username: message.myUsername,
                        gender: message.gender,
                        comment: message.comment
                    }
                }
            }
        )

        const collection1 = await coll1.findOne({ username: message.postUsername })
        if (collection1 !== null) {
            (collection1.posts).forEach(async (element, index) => {
                if (element.uniqueId === message.id) {
                    let checkUpdate = await coll1.updateOne({ username: message.postUsername }, {
                        $push: {
                            [`posts.${index}.comments`]: {
                                uniqueId: uniqueId,
                                username: message.myUsername,
                                gender: message.gender,
                                comment: message.comment
                            }
                        }
                    })
                    res.json(checkUpdate.acknowledged && commentAll.acknowledged)

                }

            });
        }

    }
    catch (err) {
        console.log(err);
    }
}



async function getMyInfo(message, res) {
    try {
        const db = client.db(dataBase);
        const coll = db.collection(userCred);
        const coll1 = db.collection(userData);
        const data = await coll.findOne({ username: message.username })
        const data1 = await coll1.findOne({ username: message.username })
        let posts = (data1.posts).map(element => {
            let likeCount = (element.likes).length
            let commentCount = (element.comments).length
            let liked = (element.likes).filter(element => (element === message.username))
            if (liked.length > 0)
                liked = true
            else
                liked = false
            return ({
                ...element,
                likeCount: (element.likes).length,
                commentCount: (element.comments).length,
                liked: liked,

            })
        })
        res.json({ username: data.username, gender: data.gender, name: data.name, email: data.email, posts: posts })

    } catch (error) {
        console.log(error);
    }
}



async function deletePost(message, res) {
    try {
        const db = client.db(dataBase);
        const coll1 = db.collection(userData);
        const coll2 = db.collection(commonData);

        const deleteCommonPost = await coll2.deleteOne({ username: message.username, uniqueId: message.postId })
        const findUserPost = await coll1.findOne({ username: message.username })
        if (findUserPost !== null) {
            (findUserPost.posts).map(async (element, index) => {
                if (element.uniqueId === message.postId) {
                    const deleteUserPost = await coll1.updateOne({ username: message.username }, {
                        $pull: { [`posts`]: { uniqueId: message.postId } }
                    })
                    if (deleteCommonPost.acknowledged && deleteUserPost.acknowledged) {
                        getPosts({ username: message.username }, res)
                    }
                }
            })
        }
    }
    catch (e) {
        console.log(e);
    }
}



async function updatePost(message, res) {
    try {
        const db = client.db(dataBase);
        const coll1 = db.collection(userData);
        const coll2 = db.collection(commonData);
        const updateCommonPost = await coll2.updateOne({ username: message.username, uniqueId: message.postId }, { $set: { ['post']: message.newPost } })
        const findUserPost = await coll1.findOne({ username: message.username })
        if (findUserPost !== null) {
            (findUserPost.posts).map(async (element, index) => {
                if (element.uniqueId === message.postId) {
                    const updateUserPost = await coll1.updateOne({ username: message.username }, {
                        $set: { [`posts.${index}.post`]: message.newPost }
                    })
                    if (updateCommonPost.acknowledged && updateUserPost.acknowledged) {
                        getPosts({ username: message.username }, res)
                    }
                }
            })
        }
    }
    catch (e) {
        console.log(e);
    }
}





function post(app) {
    app.post('/postData', async (req, res) => {
        const message = req.body.data;
        res.json(await postuser(message))
    });

    app.post('/getData', async (req, res) => {
        const message = req.body.data
        await getPosts(message, res);
    })

    app.post('/like', async (req, res) => {
        const message = req.body.data
        likePost(message, res)
    })

    app.get('/test', (req, res) => {
        res.json('Test Successful!')
    })
    app.post('/getstats', async (req, res) => {
        let message = req.body.data
        getStats(message, res)
    })
    app.post('/comment', (req, res) => {
        let message = req.body.data
        commentPost(message, res)
    })
    app.post('/myinfo', (req, res) => {
        const message = req.body.data
        getMyInfo(message, res);
    })
    app.post('/deletePost', (req, res) => {
        const message = req.body.data
        deletePost(message, res)
    })
    app.post('/editPost', (req, res) => {
        const message = req.body.data
        updatePost(message, res)
    })
}

module.exports = post;
