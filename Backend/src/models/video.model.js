import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videofile : {
            type : String,
            required : true,
        },
        thubnail : {
            type : String,
            required : true,
        },
        title : {
            type : String,
            required : true,
            trim : true,
        },
        description : {
            type : String,
            default : "",
        },
        duration : {
            type : Number,
            required : true,
        },
        views : {
            type : Number,
            default : 0,
        },
        ispublished : {
            type : Boolean,
            default : false,
        },
        owener : {
            type : Schema.Types.ObjectId,
            ref : "User",
            required : true,
        }

    },{timestamps : true}
)


videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video', videoSchema);