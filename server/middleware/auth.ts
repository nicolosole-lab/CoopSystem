export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log("Auth check:", req.isAuthenticated ? req.isAuthenticated() : false, req.path);
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};