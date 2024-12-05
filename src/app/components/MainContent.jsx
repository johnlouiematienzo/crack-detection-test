"use client";

import { useEffect, useRef, useState } from "react";
// import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

import { Box, Button, Chip, CircularProgress, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { enqueueSnackbar } from "notistack";

// import * as mobilenet from "@tensorflow-models/mobilenet";
// import * as cocossd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
const MOBILE_NET_INPUT_WIDTH = 224;
const MOBILE_NET_INPUT_HEIGHT = 224;
const MOBILE_NET_URL =
  // "https://www.kaggle.com/models/google/mobilenet-v3/TfJs/small-100-224-feature-vector/1";
  "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const MainContent = () => {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelTraining, setIsModelTraining] = useState(false);
  const [model, setModel] = useState(null); //finalModel
  const [modelBase, setModelBase] = useState(null); //baseModel
  const [modelTrain, setModelTrain] = useState(null); //trainedModel

  const [inputImageGood, setInputImageGood] = useState([]);
  const [inputImageBad, setInputImageBad] = useState([]);
  const [trainingDataInputs, setTrainingDataInputs] = useState([]);
  const [trainingDataOutputs, setTrainingDataOutputs] = useState([]);
  const classnames = ["GOOD", "BAD"];

  const [srcImage, setSrcImage] = useState(null);
  const [filename, setFilename] = useState(null);
  const imageRef = useRef(null);

  const [results, setResults] = useState([]);

  const handleInputImageGoodChange = (event) => {
    const files = event.target.files;
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      newImages.push(URL.createObjectURL(files[i]));
    }
    setInputImageGood(newImages);
  };
  const handleInputImageBadChange = (event) => {
    const files = event.target.files;
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      newImages.push(URL.createObjectURL(files[i]));
    }
    setInputImageBad(newImages);
  };

  const handleSrcImageChange = (event) => {
    const file = event.target.files[0];
    setSrcImage(URL.createObjectURL(file));
    setFilename(file.name);
    setResults([]);
  };
  const onImgLoad = (event) => {
    const canvas = document.getElementById("canvasOutput");
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageRef.current, 0, 0, 500, 500);

    identifyImage();
  };

  const identifyImage = async () => {
    const results = await predict();
    setResults(results);
  };

  const loadBaseModel = async () => {
    setIsModelLoading(true);
    try {
      const mobilenet_model = await tf.loadGraphModel(MOBILE_NET_URL, {
        fromTFHub: true,
      });
      tf.tidy(() => {
        const zero = tf.zeros([
          1,
          MOBILE_NET_INPUT_HEIGHT,
          MOBILE_NET_INPUT_WIDTH,
          3,
        ]);
        const answer = mobilenet_model.predict(zero);
      });
      // mobilenet_model.summary();
      setModelBase(mobilenet_model);
      setIsModelLoading(false);
      enqueueSnackbar("Base Model loaded successfully", { variant: "success" });
    } catch (error) {
      console.log(error);
      setIsModelLoading(false);
      enqueueSnackbar("Error loading base model", { variant: "error" });
    }
  };
  const loadModelTrain = async () => {
    let model = tf.sequential();
    model.add(
      tf.layers.dense({ inputShape: [1024], units: 128, activation: "relu" })
    );
    model.add(
      tf.layers.dense({ units: classnames.length, activation: "softmax" })
    );
    model.compile({
      optimizer: "adam",
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });
    setModelTrain(model);
  };
  const getInputImageFeatures = async () => {
    const goodImages = await Promise.all(
      inputImageGood.map(async (image) => {
        const img = new Image();
        img.src = image;
        await img.decode();
        return tf.tidy(() => {
          const imgTensor = tf.browser.fromPixels(img);
          const resized = tf.image.resizeBilinear(
            imgTensor,
            [MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH],
            true
          );
          const normalized = resized.div(255);
          return modelBase.predict(normalized.expandDims(0));
        });
      })
    );
    const badImages = await Promise.all(
      inputImageBad.map(async (image) => {
        const img = new Image();
        img.src = image;
        await img.decode();
        return tf.tidy(() => {
          const imgTensor = tf.browser.fromPixels(img);
          const resized = tf.image.resizeBilinear(
            imgTensor,
            [MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH],
            true
          );
          const normalized = resized.div(255.0);
          return modelBase.predict(normalized.expandDims(0));
        });
      })
    );
    setTrainingDataInputs(goodImages.concat(badImages));
    setTrainingDataOutputs(
      Array(goodImages.length).fill(0).concat(Array(badImages.length).fill(1))
    );
  };
  const trainModel = async () => {
    try {
      setIsModelTraining(true);
      await getInputImageFeatures();

      tf.util.shuffleCombo(trainingDataInputs, trainingDataOutputs);

      let outputsAsTensor = tf.tensor1d(trainingDataOutputs, "int32");
      let oneHotOutputs = tf.oneHot(outputsAsTensor, classnames.length);
      let inputsAsTensor = tf.stack(trainingDataInputs).squeeze();

      let results = await modelTrain.fit(inputsAsTensor, oneHotOutputs, {
        shuffle: true,
        batchSize: 5,
        epochs: 5,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log("Data for epoch " + epoch, logs);
          },
        },
      });

      outputsAsTensor.dispose();
      oneHotOutputs.dispose();
      inputsAsTensor.dispose();

      // let combinedModel = tf.sequential();
      // combinedModel.add(modelBase);
      // combinedModel.add(modelTrain);
      // combinedModel.compile({
      //   optimizer: "adam",
      //   loss: "binaryCrossentropy",
      // });
      // combinedModel.summary();
      // await combinedModel.save("downloads://my-model");
      // setModel(combinedModel);
      setIsModelTraining(false);
    } catch (error) {
      console.log(error);
      setIsModelTraining(false);
    }
  };

  const preprocess = (imageTensor) => {
    const widthToHeight = imageTensor.shape[1] / imageTensor.shape[0];
    let squareCrop;
    if (widthToHeight > 1) {
      const heightToWidth = imageTensor.shape[0] / imageTensor.shape[1];
      const cropTop = (1 - heightToWidth) / 2;
      const cropBottom = 1 - cropTop;
      squareCrop = [[cropTop, 0, cropBottom, 1]];
    } else {
      const cropLeft = (1 - widthToHeight) / 2;
      const cropRight = 1 - cropLeft;
      squareCrop = [[0, cropLeft, 1, cropRight]];
    }
    const crop = tf.image.cropAndResize(
      tf.expandDims(imageTensor),
      squareCrop,
      [0],
      [MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH]
    );
    return crop.div(255);
  };

  const predict = async () => {
    const imageTensor = tf.browser.fromPixels(imageRef.current);
    const imageFeatures = modelBase.predict(preprocess(imageTensor));
    const prediction = modelTrain.predict(imageFeatures).squeeze();
    const highestIndex = prediction.argMax().arraySync();
    const predictionArray = prediction.arraySync();

    imageTensor.dispose();
    imageFeatures.dispose();
    prediction.dispose();

    return classnames.map((className, index) => ({
      className,
      probability: predictionArray[index],
    }));
  };

  const reset = () => {
    trainingDataInputs.forEach((input) => input.dispose());
    setTrainingDataInputs([]);
    setTrainingDataOutputs([]);
    setInputImageGood([]);
    setInputImageBad([]);
    setSrcImage(null);
    setFilename(null);
    setResults([]);

    const canvas = document.getElementById("canvasOutput");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    loadBaseModel();
    loadModelTrain();
  }, []);

  if (isModelLoading) {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          width: "full",
          height: "100vh",
          display: "flex",
          gap: 4,
          p: 4,
        }}
      >
        <Box
          sx={{
            flex: 1,
            p: 2,
            border: "1px solid black",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Button variant="contained" component="label" role={undefined}>
            Upload Images for Training Good Fruits
            <VisuallyHiddenInput
              type="file"
              id="logo"
              name="Logo"
              accept="image/*"
              multiple
              onChange={handleInputImageGoodChange}
            />
          </Button>
          <Box sx={{ overflow: "hidden", display: "flex", flexWrap: "wrap" }}>
            {inputImageGood.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`img-${index}`}
                style={{ width: "100px", height: "100px" }}
              />
            ))}
          </Box>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            border: "1px solid black",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Button variant="contained" component="label" role={undefined}>
            Upload Images for Training Bad Fruits
            <VisuallyHiddenInput
              type="file"
              id="logo"
              name="Logo"
              accept="image/*"
              multiple
              onChange={handleInputImageBadChange}
            />
          </Button>
          <Box sx={{ overflow: "hidden", display: "flex", flexWrap: "wrap" }}>
            {inputImageBad.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`img-${index}`}
                style={{ width: "100px", height: "100px" }}
              />
            ))}
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 2,
            px: 2,
          }}
        >
          <Button
            variant="contained"
            onClick={trainModel}
            disabled={isModelTraining || isModelLoading}
            fullWidth
          >
            Start Training
          </Button>
          <Button variant="contained" color="error" onClick={reset} fullWidth>
            Reset
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          width: "full",
          height: "100vh",
          display: "flex",
          gap: 4,
          p: 4,
        }}
      >
        <Box
          sx={{
            flex: 1,
            p: 2,
            border: "1px solid black",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Button
            variant="contained"
            fullWidth
            component="label"
            role={undefined}
          >
            Upload Image
            <VisuallyHiddenInput
              type="file"
              id="logo"
              name="Logo"
              accept="image/*"
              onChange={handleSrcImageChange}
            />
          </Button>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: "500px",
                height: "500px",
                border: "1px solid black",
                overflow: "hidden",
              }}
            >
              {srcImage && (
                <Box
                  id="imageSrc"
                  component="img"
                  src={srcImage}
                  alt="src image"
                  ref={imageRef}
                  sx={{ width: "500px", height: "500px" }}
                  onLoad={onImgLoad}
                />
              )}
            </Box>
            <Typography variant="caption">Input: {filename}</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            border: "1px solid black",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 2,
              overflowY: "auto",
            }}
          >
            {results.map((result, index) => (
              <Chip
                key={index}
                color={result.className === "GOOD" ? "success" : "error"}
                label={`${result.className} (${(
                  result.probability * 100
                ).toFixed(2)}%)`}
              />
            ))}
          </Box>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: "500px",
                height: "500px",
                border: "1px solid black",
                overflow: "hidden",
              }}
            >
              <canvas id="canvasOutput"></canvas>
            </Box>
            <Typography variant="caption">Output:</Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MainContent;
