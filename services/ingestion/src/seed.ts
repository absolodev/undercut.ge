import { seedAll } from "./seeders/jolpica-seeder";

seedAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
