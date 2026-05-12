import { Product } from "../models/products.js";
import logger from "../utils/logger.js";
import cloudinary from "../utils/cloudinary.js";


//Helper function to cleanup images on failure of Product creation
async function deleteImages(imagesLinks) {
    if (!imagesLinks || imagesLinks.length === 0) return;

    try {
        for (let i = 0; i < imagesLinks.length; i++) {
            await cloudinary.uploader.destroy(imagesLinks[i].public_id);
            //logger.info(`${imagesLinks.length} Image's deleted successfully`);
        }
    } catch (error) {
        logger.error("Image deletion failed");
    }
}

export const createProduct = async (req, res, next) => {
    let imagesLinks = [];
    try {
        const { name, description, price, category, stock } = req.body;

        const parsedPrice = Number(price);
        const parsedStock = Number(stock);

        if (!name || !description || price == null || !category || stock == null) {
            logger.error("Please provide all the required fields");
            return res.status(400).json({
                success: false,
                message: "Please provide all the required fields",
            });
        }

        if (parsedPrice <= 0) {
            logger.error(`Invalid price value: ${parsedPrice}`);
            return res.status(400).json({
                success: false,
                message: "Price must be greater than 0",
            });
        }

        if (parsedStock === 0) {
            logger.error("Product is out of stock, cannot create");
            return res.status(400).json({
                success: false,
                message: "Product is out of stock. Stock must be at least 1 to create a product",
            });
        }

        if (parsedStock < 0) {
            logger.error(`Invalid stock value: ${parsedStock}`);
            return res.status(400).json({
                success: false,
                message: "Stock cannot be negative",
            });
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Convert buffer to base64 data URI — works with multer memoryStorage
                const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
                const result = await cloudinary.uploader.upload(base64, {
                    folder: "PHONE_PAY_PRODUCTS",
                    resource_type: "image",
                });
                imagesLinks.push({
                    public_id: result.public_id,
                    url: result.secure_url,
                });
            }
        }

        const product = await Product.create({
            name,
            description,
            price: parsedPrice,
            category,
            stock: parsedStock,
            imageUrl: imagesLinks,
        });

        logger.info("Product created successfully");
        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });

    } catch (error) {
        logger.error("Product creation failed", error);
        await deleteImages(imagesLinks);
        res.status(500).json({
            success: false,
            message: "Product creation failed",
        });
    }
};
export const getAllProducts = async (req, res, next) => {
    const product = await Product.find({})
    logger.info("Fetch all product successfully!")
    res.status(201).json({
        success: true,
        message: "All products fetched",
        product
    })
};
export const getProduct = async (req, res, next) => {
    try {
    const id = req.params.id
    const product = await Product.findById(id)
    logger.info("Fetch product successfully!")
    res.status(201).json({
        success: true,
        message: "Product fetched",
        product
    })
    } catch (error) {
        logger.error("Failed to get Single product")
        res.status(500).json({
            success: false,
            message: "Failed to get Single product",
        });
    }
 };
export const updateProduct = async (req, res, next) => {
    let newImagesLinks = [];
    try {
        const { id } = req.params;
        const { name, description, price, category, stock } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            logger.error(`Product not found: ${id}`);
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (price !== undefined) {
            const parsedPrice = Number(price);
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
                return res.status(400).json({ success: false, message: "Price must be greater than 0" });
            }
            product.price = parsedPrice;
        }

        if (stock !== undefined) {
            const parsedStock = Number(stock);
            if (isNaN(parsedStock) || parsedStock < 0) {
                return res.status(400).json({ success: false, message: "Stock cannot be negative" });
            }
            product.stock = parsedStock;
        }

        // 3. Update text fields if provided
        if (name)        product.name        = name;
        if (description) product.description = description;
        if (category)    product.category    = category;

        // 4. If new images uploaded — delete old ones from Cloudinary, upload new ones
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary
            await deleteImages(product.imageUrl);

            // Upload new images
            for (const file of req.files) {
                const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
                const result = await cloudinary.uploader.upload(base64, {
                    folder: "PHONE_PAY_PRODUCTS",
                    resource_type: "image",
                });
                newImagesLinks.push({
                    public_id: result.public_id,
                    url: result.secure_url,
                });
            }
            product.imageUrl = newImagesLinks;
        }

        await product.save();
        logger.info(`Product updated successfully: ${id}`);
        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product,
        });

    } catch (error) {
        logger.error("Product update failed", error);
        await deleteImages(newImagesLinks);
        res.status(500).json({
            success: false,
            message: "Product update failed",
        });
    }
};
export const deleteProduct = async (req, res, next) => {
    try {
        const id = req.params.id
        const product = await Product.findByIdAndDelete({id})
        logger.info("Product deleted successfully")
        res.status(201).json({
            success: true,
            message:"Product deleted successfully"
        })
        
    } catch (error) {
        logger.error("Product deletion failed", error);
        res.status(500).json({
            success: false,
            message: "Product deletion failed",
        });
    }
 };
