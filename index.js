const inputEl = document.getElementById("input-file");
inputEl.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    // const data = e.target.result;
    // const json = JSON.parse(data);
    // const state = {
    //   ...INIT_STATE,
    //   ...json,
    // };
    // logic.setState(state);
    EXIF.getData(file, function () {
      window.EXIF = EXIF;
      window.self = this;
      var allMetaData = EXIF.getTag(this, "Orientation");
      var allMetaDataSpan = document.getElementById("allMetaDataSpan");
      var allMetaDataSpan2 = document.getElementById("allMetaDataSpan2");
      allMetaDataSpan.innerHTML = allMetaData;
    });
  };
  reader.readAsText(file);
  processImageFile(file, 2048, 1365, 240, (data) => {
    const src = URL.createObjectURL(data);
    document.getElementById("img1").src = src;
  });
  // getDataUrl(file, (dataUrl) => {
  //   document.getElementById("img2").src = dataUrl;
  // });
  // readImageFile(file, (data) => {
  //   document.getElementById("img3").src = data;
  // });
});

function supportAutoOrientation(cb) {
  var testImageURL =
    "data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAA" +
    "AAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA" +
    "QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE" +
    "BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAIAAwMBEQACEQEDEQH/x" +
    "ABRAAEAAAAAAAAAAAAAAAAAAAAKEAEBAQADAQEAAAAAAAAAAAAGBQQDCAkCBwEBAAAAAAA" +
    "AAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AG8T9NfSMEVMhQ" +
    "voP3fFiRZ+MTHDifa/95OFSZU5OzRzxkyejv8ciEfhSceSXGjS8eSdLnZc2HDm4M3BxcXw" +
    "H/9k=";
  var img = document.createElement("img");
  img.onload = function () {
    // Check if the browser supports automatic image orientation:
    cb(img.width === 2 && img.height === 3);
  };
  img.src = testImageURL;
}
supportAutoOrientation((s) => {
  document.getElementById("note").innerHTML = s;
});
/**
 * Process a image file returned from camera or select from gallery
 * @method processImageFile
 * @param  {file: File, maxWidth = 2048, maxHeight = 1365, dimension = 240}
 * @return {Blob file}
 */
function processImageFile(
  file,
  maxWidth = 2048,
  maxHeight = 1365,
  dimension = 240,
  cb
) {
  const image = new Image();
  image.src = URL.createObjectURL(file);

  image.onload = () => {
    supportAutoOrientation((auto) => {
      // Get the orientation of image
      _getOrientation(file, (orientation) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = image.width;
        let height = image.height;
        // resize Image with maxWidth & maxHeight
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = width * (maxHeight / height);
          height = maxHeight;
        }
        // set proper canvas dimensions before transform & export
        if (!auto) {
          if (4 < orientation && orientation < 9) {
            canvas.width = height;
            canvas.height = width;
          } else {
            canvas.width = width;
            canvas.height = height;
          }
        }

        if (!ctx) {
          return;
        }
        if (!auto) {
          // transform context before drawing image
          switch (orientation) {
            case 2:
              ctx.transform(-1, 0, 0, 1, width, 0);
              break;
            case 3:
              ctx.transform(-1, 0, 0, -1, width, height);
              break;
            case 4:
              ctx.transform(1, 0, 0, -1, 0, height);
              break;
            case 5:
              ctx.transform(0, 1, 1, 0, 0, 0);
              break;
            case 6:
              ctx.transform(0, 1, -1, 0, height, 0);
              break;
            case 7:
              ctx.transform(0, -1, -1, 0, height, width);
              break;
            case 8:
              ctx.transform(0, -1, 1, 0, 0, width);
              break;
            default:
              break;
          }
        }
        // draw image
        ctx.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type, 1.0);
        cb(_dataURLToBlob(dataUrl, file.type));

        URL.revokeObjectURL(image.src);
      });
    });
  };
}
/**
 * [progress description]
 * @method getOrientation
 * @param  {file: File, callback: any}
 * @return Number
 */
function _getOrientation(file, callback) {
  const reader = new FileReader();
  reader.onload = (event) => {
    console.log("lskdjf");
    const target = event.target;
    const view = new DataView(target.result);

    if (view.getUint16(0, false) != 0xffd8) return callback(-2);

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker == 0xffe1) {
        if (view.getUint32((offset += 2), false) != 0x45786966) {
          return callback(-1);
        }
        const little = view.getUint16((offset += 6), false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;

        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) == 0x0112) {
            return callback(view.getUint16(offset + i * 12 + 8, little));
          }
        }
      } else if ((marker & 0xff00) != 0xff00) break;
      else offset += view.getUint16(offset, false);
    }
    return callback(-1);
  };
  reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
}

/**
 * convert dataURL (base64) to blob to reduce load size
 * @param b64Data
 * @param contentType
 * @param sliceSize
 */
function _dataURLToBlob(b64Data, contentType = "image/jpg", sliceSize = 512) {
  const byteCharacters = atob(
    b64Data.replace(/^data:image\/[a-z]+;base64,/, "").replace(/\s/g, "")
  );
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}

function getDataUrl(file, callback2) {
  var callback = function (srcOrientation) {
    var reader2 = new FileReader();
    reader2.onload = function (e) {
      var srcBase64 = e.target.result;
      var img = new Image();

      img.onload = function () {
        var width = img.width,
          height = img.height,
          canvas = document.createElement("canvas"),
          ctx = canvas.getContext("2d");

        // set proper canvas dimensions before transform & export
        if (4 < srcOrientation && srcOrientation < 9) {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        // transform context before drawing image
        switch (srcOrientation) {
          case 2:
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
          case 3:
            ctx.transform(-1, 0, 0, -1, width, height);
            break;
          case 4:
            ctx.transform(1, 0, 0, -1, 0, height);
            break;
          case 5:
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
          case 6:
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
          case 7:
            ctx.transform(0, -1, -1, 0, height, width);
            break;
          case 8:
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
          default:
            break;
        }

        // draw image
        ctx.drawImage(img, 0, 0);

        // export base64
        callback2(canvas.toDataURL());
      };

      img.src = srcBase64;
    };

    reader2.readAsDataURL(file);
  };

  var reader = new FileReader();
  reader.onload = function (e) {
    var view = new DataView(e.target.result);
    if (view.getUint16(0, false) != 0xffd8) return callback(-2);
    var length = view.byteLength,
      offset = 2;
    while (offset < length) {
      var marker = view.getUint16(offset, false);
      offset += 2;
      if (marker == 0xffe1) {
        if (view.getUint32((offset += 2), false) != 0x45786966)
          return callback(-1);
        var little = view.getUint16((offset += 6), false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        var tags = view.getUint16(offset, little);
        offset += 2;
        for (var i = 0; i < tags; i++)
          if (view.getUint16(offset + i * 12, little) == 0x0112)
            return callback(view.getUint16(offset + i * 12 + 8, little));
      } else if ((marker & 0xff00) != 0xff00) break;
      else offset += view.getUint16(offset, false);
    }
    return callback(-1);
  };
  reader.readAsArrayBuffer(file);
}

/**
 *
 *
 *
 */
const JpegOrientation = [
  "NOT_JPEG",
  "NORMAL",
  "FLIP-HORIZ",
  "ROT180",
  "FLIP-HORIZ-ROT180",
  "FLIP-HORIZ-ROT270",
  "ROT270",
  "FLIP-HORIZ-ROT90",
  "ROT90",
];

//Provided a image file, determines the orientation of the file based on the EXIF information.
//Calls the "callback" function with an index into the JpegOrientation array.
//If the image is not a JPEG, returns 0. If  the orientation value cannot be read (corrupted file?) return -1.
function getOrientation(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const view = new DataView(e.target.result);

    if (view.getUint16(0, false) !== 0xffd8) {
      return callback(0); //NOT A JPEG FILE
    }

    const length = view.byteLength;
    let offset = 2;
    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8)
        //unknown?
        return callback(-1);

      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        if (view.getUint32((offset += 2), false) !== 0x45786966)
          return callback(-1); //unknown?

        const little = view.getUint16((offset += 6), false) === 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (var i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) === 0x0112) {
            return callback(view.getUint16(offset + i * 12 + 8, little)); //found orientation code
          }
        }
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }

    return callback(-1); //unknown?
  };
  reader.readAsArrayBuffer(file);
}

//Takes a jpeg image file as base64 and transforms it back to original, providing the
//transformed image in callback.  If the image is not a jpeg or is already in normal orientation,
//just calls the callback directly with the source.
//Set type to the desired output type if transformed, default is image/jpeg for speed.
function resetOrientation(
  srcBase64,
  srcOrientation,
  callback,
  type = "image/jpeg"
) {
  if (srcOrientation <= 1) {
    //no transform needed
    callback(srcBase64);
    return;
  }

  const img = new Image();

  img.onload = () => {
    const width = img.width;
    const height = img.height;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // set proper canvas dimensions before transform & export
    if (4 < srcOrientation && srcOrientation < 9) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    // transform context before drawing image
    switch (srcOrientation) {
      //case 1: normal, no transform needed

      case 2:
        ctx.transform(-1, 0, 0, 1, width, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, width, height);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, height);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, height, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, height, width);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, width);
        break;
      default:
        break;
    }

    // draw image
    ctx.drawImage(img, 0, 0);

    //export base64
    callback(canvas.toDataURL(type), srcOrientation);
  };

  img.src = srcBase64;
}

//Read an image file, providing the returned data to callback. If the image is jpeg
//and is transformed according to EXIF info, transform it first.
//The callback function receives the image data and the orientation value (index into JpegOrientation)
function readImageFile(file, callback) {
  getOrientation(file, (orientation) => {
    console.log(
      'Read file "' +
        file.name +
        '" with orientation: ' +
        JpegOrientation[orientation]
    );

    const reader = new FileReader();
    reader.onload = () => {
      //when reading complete

      const img = reader.result;
      resetOrientation(img, orientation, callback);
    };
    reader.readAsDataURL(file); //start read
  });
}
