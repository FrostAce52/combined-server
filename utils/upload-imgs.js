import multer from "multer";
import { v4 } from "uuid";
// 1. 篩選檔案, 2. 決定副檔名
const extMap = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
//檔案篩選
const fileFilter = (req, file, cb) => {
  cb(null, !!extMap[file.mimetype]);
};
//儲存位置與檔名
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img");
  },
  filename: (req, file, cb) => {
    const f = v4() + extMap[file.mimetype];
    cb(null, f);
  },
});
//匯出
export default multer({ fileFilter, storage });
