"use client";

import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
// import Script from "next/script";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { enqueueSnackbar } from "notistack";

import * as mobilenet from "@tensorflow-models/mobilenet";

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
  const [model, setModel] = useState(null);

  const [srcImage, setSrcImage] = useState(null);
  const [filename, setFilename] = useState(null);
  const imageRef = useRef(null);

  const [results, setResults] = useState([]);

  const handleSrcImageChange = (event) => {
    const file = event.target.files[0];
    setSrcImage(URL.createObjectURL(file));
    setFilename(file.name);
    setResults([]);

    // const reader = new FileReader();
    // reader.onload = (e) => {
    //   setSrcImage(e.target.result);
    // };
    // reader.readAsDataURL(file);
  };
  const onImgLoad = (event) => {
    identifyImage();
  };

  const identifyImage = async () => {
    const results = await model.classify(imageRef.current);
    console.log(results);
    setResults(results);
  };

  const loadModel = async () => {
    setIsModelLoading(true);
    try {
      const model = await mobilenet.load();
      setModel(model);
      setIsModelLoading(false);
      enqueueSnackbar("Model loaded successfully", { variant: "success" });
    } catch (error) {
      console.log(error);
      setIsModelLoading(false);
      enqueueSnackbar("Error loading model", { variant: "error" });
    }
  };

  useEffect(() => {
    loadModel();
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
      {/* <Script
        src="/scripts/opencv/opencv.js"
        onReady={() => console.log("loaded opencv.js")}
      />
      <Script
        src="/scripts/opencv/init.js"
        onReady={() => console.log("loaded index.js")}
      /> */}
    </>
  );
};

export default MainContent;
