import { useState, useEffect } from "react";
import { set } from "zod";

export const useScroll = (threshold: number = 10) => {
  const [isScrollred, setIsScrollred] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrollred(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);
  return isScrollred;
};
