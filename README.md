# Metal-Model-Checklist-Database
A community driven database for metal models from various brands. This checklist is used with the "Metal Earth Checklist" application currently available on IOS.

Currently supported brands: Metal Earth, Piececool, MU

Instructions:

New Entries MUST follow this format:

    {
        "number": "MODEL NUMBER",
        "name": "MODEL NAME",
        "difficulty": null, 
        "sheets": 1,
        "link": "https://www.metalearth.com/lockheed-martin/blue-angels-c-130-hercules",
        "checked": false,
        "type": "Premium Series",
        "status": "",
        "category": "Lockheed Martin®",
        "instructionsLink": "",
        "360View": "https://www.metalearth.com/360/PS2027",
        "description": "Model Description",
        "productimage": "https://www.metalearth.com/content/images/thumbs/0005778_blue-angels-c-130-hercules_570.png"
    },

Number - "Model Number"
Name - "Model Name"
Difficulty - Single number from 1 - 10, or null if unknown (Note: No quote marks required)
Sheets - Number of Sheets (Note: No quote marks required)
Link - "Link to Product Page"
Checked - (LEAVE THIS AS "checked": false,)
Type - Can be either: "Metal Earth" / "ICONX" / "Legends" / "Mega" / "Premium Series" / "MU" / "Piececool"
Status - Can be either "" (Blank) / "Coming Soon" / "Exclusive" / "Retired"
Category - "Model Category"
Instructions Link - "Link to Instructions PDF File"
360View - "Link to Model 360 View" (Leave blank for MU and Piececool "")
Description - "Model Description"
Product Image "Link to product image"

Please note that the mode is wrapped in {} as seen above. If the model is not the final model in the list it should have a , following the }.


