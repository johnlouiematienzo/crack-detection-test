import cv from "./opencv";

export const showImage = (imgID, canvasID) => {
  const imgElement = document.getElementById(imgID);
  const mat = cv.imread(imgElement);
  cv.imshow(canvasID, mat);
  mat.delete();
};
